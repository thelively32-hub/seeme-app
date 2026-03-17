import os
from datetime import datetime, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from passlib.context import CryptContext
from jose import JWTError, jwt

load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "seeme-super-secret-key-2024-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.seeme_db

# Collections
users_collection = db.users
places_collection = db.places
checkins_collection = db.checkins


# ============== MODELS ==============

# User Models
class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    age: Optional[int] = Field(None, ge=18, le=100)


class UserVibe(BaseModel):
    gender: str = Field(..., pattern="^(man|woman|nonbinary)$")
    looking_for: List[str]
    intention: str = Field(..., pattern="^(friends|date|casual)$")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    age: Optional[int] = None
    gender: Optional[str] = None
    looking_for: Optional[List[str]] = None
    intention: Optional[str] = None
    vibes: int = 0
    connection_rate: float = 0.0
    is_premium: bool = False
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Place Models
class PlaceResponse(BaseModel):
    id: str
    name: str
    type: str
    address: str
    latitude: float
    longitude: float
    description: Optional[str] = None
    # New activity fields
    activity_level: str  # none, low, medium, high, trending
    activity_label: str
    is_trending: bool
    activity_updated_at: datetime
    distance: Optional[str] = None


# Check-in Models
class CheckInCreate(BaseModel):
    place_id: str
    qr_code: Optional[str] = None


class CheckInResponse(BaseModel):
    id: str
    user_id: str
    place_id: str
    place_name: str
    checked_in_at: datetime
    checked_out_at: Optional[datetime] = None
    is_active: bool = True


# ============== ACTIVITY SYSTEM ==============

async def get_active_checkins_count(place_id: str) -> int:
    """
    Count REAL active check-ins for a place.
    - Must be active (is_active=True)
    - Must be recent (< 2 hours)
    - Must not have checked out (checked_out_at=None)
    """
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    
    count = await checkins_collection.count_documents({
        "place_id": place_id,
        "is_active": True,
        "checked_in_at": {"$gte": two_hours_ago},
        "checked_out_at": None
    })
    
    return count


def calculate_activity_level(active_count: int) -> dict:
    """
    Calculate activity level based on active check-ins.
    Thresholds:
    - trending: 20+
    - high: 10-19
    - medium: 4-9
    - low: 1-3
    - none: 0
    """
    if active_count >= 20:
        return {
            "level": "trending",
            "label": "Trending now 🔥",
            "is_trending": True
        }
    elif active_count >= 10:
        return {
            "level": "high",
            "label": "High activity",
            "is_trending": False
        }
    elif active_count >= 4:
        return {
            "level": "medium",
            "label": "Getting busy",
            "is_trending": False
        }
    elif active_count >= 1:
        return {
            "level": "low",
            "label": "Low activity",
            "is_trending": False
        }
    else:
        return {
            "level": "none",
            "label": "Be the first one here 👀",
            "is_trending": False
        }


async def cleanup_expired_checkins():
    """
    Mark check-ins older than 2 hours as inactive.
    This prevents zombie check-ins from inflating activity.
    """
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    
    result = await checkins_collection.update_many(
        {
            "is_active": True,
            "checked_in_at": {"$lt": two_hours_ago},
            "checked_out_at": None
        },
        {
            "$set": {
                "is_active": False,
                "checked_out_at": datetime.utcnow()
            }
        }
    )
    
    return result.modified_count


# ============== HELPERS ==============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception
    return user


def user_to_response(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        age=user.get("age"),
        gender=user.get("gender"),
        looking_for=user.get("looking_for"),
        intention=user.get("intention"),
        vibes=user.get("vibes", 0),
        connection_rate=user.get("connection_rate", 0.0),
        is_premium=user.get("is_premium", False),
        created_at=user.get("created_at", datetime.utcnow()),
    )


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two points (simplified)"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth's radius in km
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


# ============== LIFESPAN ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create indexes and seed data
    await users_collection.create_index("email", unique=True)
    await places_collection.create_index([("latitude", 1), ("longitude", 1)])
    await checkins_collection.create_index([("user_id", 1), ("is_active", 1)])
    await checkins_collection.create_index([("place_id", 1), ("is_active", 1)])
    await checkins_collection.create_index("checked_in_at")
    
    # Cleanup expired check-ins on startup
    expired_count = await cleanup_expired_checkins()
    print(f"Cleaned up {expired_count} expired check-ins")
    
    # Seed sample places if empty
    if await places_collection.count_documents({}) == 0:
        await seed_sample_places()
    
    yield
    # Shutdown
    client.close()


# ============== APP ==============

app = FastAPI(
    title="SEE ME API",
    description="Real-time social presence platform API",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== SEED DATA ==============

async def seed_sample_places():
    """Seed sample places for demo"""
    sample_places = [
        {
            "name": "Neon Club",
            "type": "Nightclub",
            "address": "123 Party Ave, Downtown",
            "latitude": 40.7128,
            "longitude": -74.0060,
            "description": "The hottest nightclub in town",
            "created_at": datetime.utcnow(),
        },
        {
            "name": "Skybar Rooftop",
            "type": "Bar",
            "address": "456 High St, Midtown",
            "latitude": 40.7580,
            "longitude": -73.9855,
            "description": "Stunning views and craft cocktails",
            "created_at": datetime.utcnow(),
        },
        {
            "name": "The Social House",
            "type": "Lounge",
            "address": "789 Chill Blvd, Westside",
            "latitude": 40.7489,
            "longitude": -73.9680,
            "description": "Relaxed vibes and great conversations",
            "created_at": datetime.utcnow(),
        },
        {
            "name": "Velvet Room",
            "type": "Club",
            "address": "321 Night Ln, East Village",
            "latitude": 40.7264,
            "longitude": -73.9897,
            "description": "Exclusive club experience",
            "created_at": datetime.utcnow(),
        },
        {
            "name": "Cafe Luna",
            "type": "Cafe",
            "address": "555 Coffee St, SoHo",
            "latitude": 40.7233,
            "longitude": -74.0030,
            "description": "Cozy cafe with live music",
            "created_at": datetime.utcnow(),
        },
        {
            "name": "Pulse Nightclub",
            "type": "Nightclub",
            "address": "888 Beat St, Meatpacking",
            "latitude": 40.7410,
            "longitude": -74.0080,
            "description": "EDM and house music paradise",
            "created_at": datetime.utcnow(),
        },
    ]
    await places_collection.insert_many(sample_places)


# ============== AUTH ENDPOINTS ==============

@app.post("/api/auth/register", response_model=TokenResponse, tags=["Auth"])
async def register(user_data: UserCreate):
    """Register a new user"""
    existing = await users_collection.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = {
        "name": user_data.name,
        "email": user_data.email,
        "password": get_password_hash(user_data.password),
        "age": user_data.age,
        "gender": None,
        "looking_for": None,
        "intention": None,
        "vibes": 0,
        "connection_rate": 0.0,
        "is_premium": False,
        "created_at": datetime.utcnow(),
    }
    
    result = await users_collection.insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    
    token = create_access_token(data={"sub": str(result.inserted_id)})
    
    return TokenResponse(
        access_token=token,
        user=user_to_response(user_dict)
    )


@app.post("/api/auth/login", response_model=TokenResponse, tags=["Auth"])
async def login(credentials: UserLogin):
    """Login user"""
    user = await users_collection.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token(data={"sub": str(user["_id"])})
    
    return TokenResponse(
        access_token=token,
        user=user_to_response(user)
    )


@app.get("/api/auth/me", response_model=UserResponse, tags=["Auth"])
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return user_to_response(current_user)


@app.put("/api/auth/vibe", response_model=UserResponse, tags=["Auth"])
async def set_vibe(vibe_data: UserVibe, current_user: dict = Depends(get_current_user)):
    """Set user's vibe (gender, looking for, intention)"""
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "gender": vibe_data.gender,
            "looking_for": vibe_data.looking_for,
            "intention": vibe_data.intention,
        }}
    )
    
    updated = await users_collection.find_one({"_id": current_user["_id"]})
    return user_to_response(updated)


# ============== PLACES ENDPOINTS ==============

@app.get("/api/places", response_model=List[PlaceResponse], tags=["Places"])
async def get_places(
    type: Optional[str] = None,
    trending: Optional[bool] = None,
    limit: int = 20,
    user_lat: Optional[float] = None,
    user_lon: Optional[float] = None
):
    """
    Get list of places with REAL activity levels.
    Activity is calculated from actual check-ins.
    """
    # Cleanup expired check-ins first
    await cleanup_expired_checkins()
    
    query = {}
    if type:
        query["type"] = type
    
    cursor = places_collection.find(query).limit(limit)
    places = await cursor.to_list(length=limit)
    
    result = []
    for p in places:
        place_id = str(p["_id"])
        
        # Get REAL activity count
        active_count = await get_active_checkins_count(place_id)
        activity = calculate_activity_level(active_count)
        
        # Filter by trending if requested
        if trending is not None and activity["is_trending"] != trending:
            continue
        
        # Calculate distance if user location provided
        distance = None
        if user_lat and user_lon:
            dist_km = calculate_distance(user_lat, user_lon, p["latitude"], p["longitude"])
            distance = f"{dist_km:.1f} km"
        else:
            # Mock distance for demo
            import random
            distance = f"{random.uniform(0.1, 2.0):.1f} km"
        
        result.append(PlaceResponse(
            id=place_id,
            name=p["name"],
            type=p["type"],
            address=p["address"],
            latitude=p["latitude"],
            longitude=p["longitude"],
            description=p.get("description"),
            activity_level=activity["level"],
            activity_label=activity["label"],
            is_trending=activity["is_trending"],
            activity_updated_at=datetime.utcnow(),
            distance=distance,
        ))
    
    # Sort by activity level (trending first)
    level_order = {"trending": 0, "high": 1, "medium": 2, "low": 3, "none": 4}
    result.sort(key=lambda x: level_order.get(x.activity_level, 5))
    
    return result


@app.get("/api/places/{place_id}", response_model=PlaceResponse, tags=["Places"])
async def get_place(place_id: str):
    """Get single place details with real activity"""
    if not ObjectId.is_valid(place_id):
        raise HTTPException(status_code=400, detail="Invalid place ID")
    
    place = await places_collection.find_one({"_id": ObjectId(place_id)})
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Get REAL activity
    active_count = await get_active_checkins_count(place_id)
    activity = calculate_activity_level(active_count)
    
    return PlaceResponse(
        id=str(place["_id"]),
        name=place["name"],
        type=place["type"],
        address=place["address"],
        latitude=place["latitude"],
        longitude=place["longitude"],
        description=place.get("description"),
        activity_level=activity["level"],
        activity_label=activity["label"],
        is_trending=activity["is_trending"],
        activity_updated_at=datetime.utcnow(),
    )


# ============== CHECK-IN ENDPOINTS ==============

@app.post("/api/checkins", response_model=CheckInResponse, tags=["Check-ins"])
async def check_in(
    checkin_data: CheckInCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Check in to a place.
    ANTI-SPAM: If user already has active check-in, UPDATE it instead of creating new.
    """
    # Validate place exists
    if not ObjectId.is_valid(checkin_data.place_id):
        raise HTTPException(status_code=400, detail="Invalid place ID")
    
    place = await places_collection.find_one({"_id": ObjectId(checkin_data.place_id)})
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    user_id = str(current_user["_id"])
    
    # ANTI-SPAM: Check if user already has an active check-in
    existing_checkin = await checkins_collection.find_one({
        "user_id": user_id,
        "is_active": True,
        "checked_out_at": None
    })
    
    if existing_checkin:
        # UPDATE existing check-in instead of creating new
        # This prevents users from inflating activity
        await checkins_collection.update_one(
            {"_id": existing_checkin["_id"]},
            {"$set": {
                "place_id": checkin_data.place_id,
                "place_name": place["name"],
                "checked_in_at": datetime.utcnow()
            }}
        )
        
        # Add vibes to user
        await users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$inc": {"vibes": 1}}
        )
        
        return CheckInResponse(
            id=str(existing_checkin["_id"]),
            user_id=user_id,
            place_id=checkin_data.place_id,
            place_name=place["name"],
            checked_in_at=datetime.utcnow(),
            is_active=True
        )
    
    # Create new check-in
    checkin = {
        "user_id": user_id,
        "place_id": checkin_data.place_id,
        "place_name": place["name"],
        "checked_in_at": datetime.utcnow(),
        "checked_out_at": None,
        "is_active": True,
    }
    
    result = await checkins_collection.insert_one(checkin)
    
    # Add vibes to user
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"vibes": 1}}
    )
    
    return CheckInResponse(
        id=str(result.inserted_id),
        user_id=user_id,
        place_id=checkin_data.place_id,
        place_name=place["name"],
        checked_in_at=checkin["checked_in_at"],
        is_active=True
    )


@app.post("/api/checkins/checkout", response_model=CheckInResponse, tags=["Check-ins"])
async def check_out(current_user: dict = Depends(get_current_user)):
    """Check out from current place"""
    active_checkin = await checkins_collection.find_one({
        "user_id": str(current_user["_id"]),
        "is_active": True,
        "checked_out_at": None
    })
    
    if not active_checkin:
        raise HTTPException(status_code=404, detail="No active check-in found")
    
    checkout_time = datetime.utcnow()
    
    await checkins_collection.update_one(
        {"_id": active_checkin["_id"]},
        {"$set": {
            "is_active": False,
            "checked_out_at": checkout_time
        }}
    )
    
    return CheckInResponse(
        id=str(active_checkin["_id"]),
        user_id=active_checkin["user_id"],
        place_id=active_checkin["place_id"],
        place_name=active_checkin["place_name"],
        checked_in_at=active_checkin["checked_in_at"],
        checked_out_at=checkout_time,
        is_active=False
    )


@app.get("/api/checkins/active", response_model=Optional[CheckInResponse], tags=["Check-ins"])
async def get_active_checkin(current_user: dict = Depends(get_current_user)):
    """Get user's current active check-in"""
    active_checkin = await checkins_collection.find_one({
        "user_id": str(current_user["_id"]),
        "is_active": True,
        "checked_out_at": None
    })
    
    if not active_checkin:
        return None
    
    return CheckInResponse(
        id=str(active_checkin["_id"]),
        user_id=active_checkin["user_id"],
        place_id=active_checkin["place_id"],
        place_name=active_checkin["place_name"],
        checked_in_at=active_checkin["checked_in_at"],
        is_active=True
    )


@app.get("/api/checkins/history", response_model=List[CheckInResponse], tags=["Check-ins"])
async def get_checkin_history(
    current_user: dict = Depends(get_current_user),
    limit: int = 20
):
    """Get user's check-in history"""
    cursor = checkins_collection.find(
        {"user_id": str(current_user["_id"])}
    ).sort("checked_in_at", -1).limit(limit)
    
    checkins = await cursor.to_list(length=limit)
    
    return [
        CheckInResponse(
            id=str(c["_id"]),
            user_id=c["user_id"],
            place_id=c["place_id"],
            place_name=c["place_name"],
            checked_in_at=c["checked_in_at"],
            checked_out_at=c.get("checked_out_at"),
            is_active=c.get("is_active", False)
        )
        for c in checkins
    ]


# ============== STATS ENDPOINTS ==============

@app.get("/api/stats/user", tags=["Stats"])
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    """Get user statistics"""
    user_id = str(current_user["_id"])
    
    # Count total check-ins
    total_checkins = await checkins_collection.count_documents({
        "user_id": user_id
    })
    
    # Get unique places visited
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$place_id"}},
        {"$count": "unique_places"}
    ]
    result = await checkins_collection.aggregate(pipeline).to_list(1)
    unique_places = result[0]["unique_places"] if result else 0
    
    # Get current active check-in
    active_checkin = await checkins_collection.find_one({
        "user_id": user_id,
        "is_active": True,
        "checked_out_at": None
    })
    
    return {
        "vibes": current_user.get("vibes", 0),
        "connection_rate": current_user.get("connection_rate", 0),
        "total_checkins": total_checkins,
        "unique_places": unique_places,
        "best_night": "Saturday",  # TODO: Calculate from data
        "is_premium": current_user.get("is_premium", False),
        "current_place": active_checkin["place_name"] if active_checkin else None,
    }


# ============== ADMIN/DEBUG ENDPOINTS ==============

@app.post("/api/admin/cleanup", tags=["Admin"])
async def force_cleanup():
    """Force cleanup of expired check-ins (for testing)"""
    expired_count = await cleanup_expired_checkins()
    return {"cleaned_up": expired_count}


# ============== HEALTH CHECK ==============

@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "SEE ME API",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "features": {
            "real_activity": True,
            "anti_spam": True,
            "auto_cleanup": True
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
