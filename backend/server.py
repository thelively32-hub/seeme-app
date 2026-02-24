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
import random

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
connections_collection = db.connections


# ============== MODELS ==============

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, values=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)


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
class PlaceBase(BaseModel):
    name: str
    type: str  # club, bar, lounge, cafe, restaurant
    address: str
    latitude: float
    longitude: float
    description: Optional[str] = None


class PlaceCreate(PlaceBase):
    pass


class PlaceResponse(PlaceBase):
    id: str
    activity: int = 0  # 0-100
    people_count: int = 0
    trending: bool = False
    distance: Optional[str] = None
    created_at: datetime


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


# Connection Models
class ConnectionRequest(BaseModel):
    target_user_id: str


class ConnectionResponse(BaseModel):
    id: str
    user_id: str
    target_user_id: str
    status: str  # pending, accepted, rejected
    created_at: datetime


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


# ============== LIFESPAN ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create indexes and seed data
    await users_collection.create_index("email", unique=True)
    await places_collection.create_index([("latitude", 1), ("longitude", 1)])
    await checkins_collection.create_index([("user_id", 1), ("is_active", 1)])
    
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
    version="1.0.0",
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
            "activity": 92,
            "people_count": 156,
            "trending": True,
            "created_at": datetime.utcnow(),
        },
        {
            "name": "Skybar Rooftop",
            "type": "Bar",
            "address": "456 High St, Midtown",
            "latitude": 40.7580,
            "longitude": -73.9855,
            "description": "Stunning views and craft cocktails",
            "activity": 78,
            "people_count": 89,
            "trending": True,
            "created_at": datetime.utcnow(),
        },
        {
            "name": "The Social House",
            "type": "Lounge",
            "address": "789 Chill Blvd, Westside",
            "latitude": 40.7489,
            "longitude": -73.9680,
            "description": "Relaxed vibes and great conversations",
            "activity": 65,
            "people_count": 52,
            "trending": False,
            "created_at": datetime.utcnow(),
        },
        {
            "name": "Velvet Room",
            "type": "Club",
            "address": "321 Night Ln, East Village",
            "latitude": 40.7264,
            "longitude": -73.9897,
            "description": "Exclusive club experience",
            "activity": 45,
            "people_count": 34,
            "trending": False,
            "created_at": datetime.utcnow(),
        },
        {
            "name": "Cafe Luna",
            "type": "Cafe",
            "address": "555 Coffee St, SoHo",
            "latitude": 40.7233,
            "longitude": -74.0030,
            "description": "Cozy cafe with live music",
            "activity": 38,
            "people_count": 18,
            "trending": False,
            "created_at": datetime.utcnow(),
        },
        {
            "name": "Pulse Nightclub",
            "type": "Nightclub",
            "address": "888 Beat St, Meatpacking",
            "latitude": 40.7410,
            "longitude": -74.0080,
            "description": "EDM and house music paradise",
            "activity": 85,
            "people_count": 203,
            "trending": True,
            "created_at": datetime.utcnow(),
        },
    ]
    await places_collection.insert_many(sample_places)


# ============== AUTH ENDPOINTS ==============

@app.post("/api/auth/register", response_model=TokenResponse, tags=["Auth"])
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if user exists
    existing = await users_collection.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
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
    
    # Create token
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
    limit: int = 20
):
    """Get list of places with activity levels"""
    query = {}
    if type:
        query["type"] = type
    if trending is not None:
        query["trending"] = trending
    
    cursor = places_collection.find(query).limit(limit).sort("activity", -1)
    places = await cursor.to_list(length=limit)
    
    return [
        PlaceResponse(
            id=str(p["_id"]),
            name=p["name"],
            type=p["type"],
            address=p["address"],
            latitude=p["latitude"],
            longitude=p["longitude"],
            description=p.get("description"),
            activity=p.get("activity", 0),
            people_count=p.get("people_count", 0),
            trending=p.get("trending", False),
            distance=f"{random.uniform(0.1, 2.0):.1f} km",  # Mock distance
            created_at=p.get("created_at", datetime.utcnow()),
        )
        for p in places
    ]


@app.get("/api/places/{place_id}", response_model=PlaceResponse, tags=["Places"])
async def get_place(place_id: str):
    """Get single place details"""
    if not ObjectId.is_valid(place_id):
        raise HTTPException(status_code=400, detail="Invalid place ID")
    
    place = await places_collection.find_one({"_id": ObjectId(place_id)})
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    return PlaceResponse(
        id=str(place["_id"]),
        name=place["name"],
        type=place["type"],
        address=place["address"],
        latitude=place["latitude"],
        longitude=place["longitude"],
        description=place.get("description"),
        activity=place.get("activity", 0),
        people_count=place.get("people_count", 0),
        trending=place.get("trending", False),
        created_at=place.get("created_at", datetime.utcnow()),
    )


# ============== CHECK-IN ENDPOINTS ==============

@app.post("/api/checkins", response_model=CheckInResponse, tags=["Check-ins"])
async def check_in(
    checkin_data: CheckInCreate,
    current_user: dict = Depends(get_current_user)
):
    """Check in to a place"""
    # Validate place exists
    if not ObjectId.is_valid(checkin_data.place_id):
        raise HTTPException(status_code=400, detail="Invalid place ID")
    
    place = await places_collection.find_one({"_id": ObjectId(checkin_data.place_id)})
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Check if already checked in somewhere
    active_checkin = await checkins_collection.find_one({
        "user_id": str(current_user["_id"]),
        "is_active": True
    })
    
    if active_checkin:
        # Auto checkout from previous location
        await checkins_collection.update_one(
            {"_id": active_checkin["_id"]},
            {"$set": {"is_active": False, "checked_out_at": datetime.utcnow()}}
        )
        # Decrease people count at old place
        await places_collection.update_one(
            {"_id": ObjectId(active_checkin["place_id"])},
            {"$inc": {"people_count": -1}}
        )
    
    # Create new check-in
    checkin = {
        "user_id": str(current_user["_id"]),
        "place_id": checkin_data.place_id,
        "place_name": place["name"],
        "checked_in_at": datetime.utcnow(),
        "checked_out_at": None,
        "is_active": True,
    }
    
    result = await checkins_collection.insert_one(checkin)
    
    # Increase people count and update activity
    new_count = place.get("people_count", 0) + 1
    new_activity = min(100, int(new_count * 0.5) + random.randint(10, 30))
    
    await places_collection.update_one(
        {"_id": ObjectId(checkin_data.place_id)},
        {
            "$inc": {"people_count": 1},
            "$set": {
                "activity": new_activity,
                "trending": new_activity >= 70
            }
        }
    )
    
    # Add vibes to user
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"vibes": 1}}
    )
    
    return CheckInResponse(
        id=str(result.inserted_id),
        user_id=str(current_user["_id"]),
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
        "is_active": True
    })
    
    if not active_checkin:
        raise HTTPException(status_code=404, detail="No active check-in found")
    
    checkout_time = datetime.utcnow()
    
    await checkins_collection.update_one(
        {"_id": active_checkin["_id"]},
        {"$set": {"is_active": False, "checked_out_at": checkout_time}}
    )
    
    # Decrease people count
    await places_collection.update_one(
        {"_id": ObjectId(active_checkin["place_id"])},
        {"$inc": {"people_count": -1}}
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
    # Count total check-ins
    total_checkins = await checkins_collection.count_documents({
        "user_id": str(current_user["_id"])
    })
    
    # Get unique places visited
    pipeline = [
        {"$match": {"user_id": str(current_user["_id"])}},
        {"$group": {"_id": "$place_id"}},
        {"$count": "unique_places"}
    ]
    result = await checkins_collection.aggregate(pipeline).to_list(1)
    unique_places = result[0]["unique_places"] if result else 0
    
    # Calculate best night (mock for now)
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    best_night = random.choice(["Friday", "Saturday"])
    
    return {
        "vibes": current_user.get("vibes", 0),
        "connection_rate": current_user.get("connection_rate", 0),
        "total_checkins": total_checkins,
        "unique_places": unique_places,
        "best_night": best_night,
        "is_premium": current_user.get("is_premium", False),
    }


# ============== HEALTH CHECK ==============

@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "SEE ME API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
