import os
import httpx
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

# Google Places API Configuration
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "AIzaSyCPKT55qhr18vD63d91A5Ys6NoZvsq3D0s")
GOOGLE_PLACES_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

# ============== CONFIGURATION ==============

# Check-in radius in meters (configurable)
CHECKIN_RADIUS_METERS = int(os.getenv("CHECKIN_RADIUS", "75"))
# Maximum acceptable GPS accuracy in meters
MAX_GPS_ACCURACY_METERS = int(os.getenv("MAX_GPS_ACCURACY", "50"))

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
checkin_logs_collection = db.checkin_logs  # GPS validation logs


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
    # GPS validation fields
    user_latitude: Optional[float] = None
    user_longitude: Optional[float] = None
    gps_accuracy: Optional[float] = None  # Accuracy in meters
    is_mocked: Optional[bool] = False  # True if mock location detected


class CheckInResponse(BaseModel):
    id: str
    user_id: str
    place_id: str
    place_name: str
    checked_in_at: datetime
    checked_out_at: Optional[datetime] = None
    is_active: bool = True


# Location validation models
class LocationValidation(BaseModel):
    place_id: str
    user_latitude: float
    user_longitude: float
    gps_accuracy: float  # Accuracy in meters
    is_mocked: bool = False


class LocationValidationResponse(BaseModel):
    valid: bool
    distance_meters: float
    accuracy_meters: float
    within_radius: bool
    accuracy_acceptable: bool
    error_message: Optional[str] = None
    can_checkin: bool


# Check-in attempt log model
class CheckInAttemptLog(BaseModel):
    user_id: str
    place_id: str
    distance_meters: float
    accuracy_meters: float
    result: str  # success, failed_distance, failed_accuracy, failed_mocked
    timestamp: datetime


# ============== ACTIVITY SYSTEM ==============

def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in METERS between two points using Haversine formula"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371000  # Earth's radius in METERS
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


async def validate_location_for_checkin(
    user_lat: float,
    user_lon: float,
    place_lat: float,
    place_lon: float,
    gps_accuracy: float,
    is_mocked: bool = False
) -> dict:
    """
    Validate if user location is valid for check-in.
    Returns validation result with details.
    """
    # Calculate distance
    distance = calculate_distance_meters(user_lat, user_lon, place_lat, place_lon)
    
    # Check if within radius
    within_radius = distance <= CHECKIN_RADIUS_METERS
    
    # Check if accuracy is acceptable
    accuracy_acceptable = gps_accuracy <= MAX_GPS_ACCURACY_METERS
    
    # Determine if check-in is allowed
    can_checkin = within_radius and accuracy_acceptable and not is_mocked
    
    # Generate appropriate error message
    error_message = None
    if is_mocked:
        error_message = "Mock location detected. Please disable mock locations to check in."
    elif not accuracy_acceptable:
        error_message = f"GPS signal too weak (accuracy: {gps_accuracy:.0f}m). Move to an open area and try again."
    elif not within_radius:
        error_message = f"You're {distance:.0f}m away. Move closer to check in ({CHECKIN_RADIUS_METERS}m required)."
    
    return {
        "valid": can_checkin,
        "distance_meters": round(distance, 1),
        "accuracy_meters": round(gps_accuracy, 1),
        "within_radius": within_radius,
        "accuracy_acceptable": accuracy_acceptable,
        "is_mocked": is_mocked,
        "error_message": error_message,
        "can_checkin": can_checkin,
        "radius_required": CHECKIN_RADIUS_METERS,
        "accuracy_required": MAX_GPS_ACCURACY_METERS
    }


async def log_checkin_attempt(
    user_id: str,
    place_id: str,
    distance: float,
    accuracy: float,
    result: str
):
    """Log check-in attempt for debugging and fraud detection"""
    log_entry = {
        "user_id": user_id,
        "place_id": place_id,
        "distance_meters": distance,
        "accuracy_meters": accuracy,
        "result": result,  # success, failed_distance, failed_accuracy, failed_mocked
        "timestamp": datetime.utcnow()
    }
    await checkin_logs_collection.insert_one(log_entry)
    print(f"Check-in attempt logged: user={user_id}, place={place_id}, distance={distance:.1f}m, result={result}")

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
            "label": "Hot social vibe 🔥",
            "is_trending": True
        }
    elif active_count >= 10:
        return {
            "level": "high",
            "label": "Active social scene",
            "is_trending": False
        }
    elif active_count >= 4:
        return {
            "level": "medium",
            "label": "Growing social energy",
            "is_trending": False
        }
    elif active_count >= 1:
        return {
            "level": "low",
            "label": "Quiet vibe",
            "is_trending": False
        }
    else:
        return {
            "level": "none",
            "label": "Fresh spot — be first 👀",
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


# Configuration for nearby places
NEARBY_RADIUS_METERS = int(os.getenv("NEARBY_RADIUS_METERS", "2000"))  # 2km default for Google Places
NEARBY_MAX_PLACES = int(os.getenv("NEARBY_MAX_PLACES", "25"))


# ============== GOOGLE PLACES INTEGRATION ==============

class NearbyPlaceResponse(BaseModel):
    """Response model for nearby places including Google Places data"""
    id: str
    name: str
    type: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    activity_level: str
    activity_label: str
    is_trending: bool
    distance: Optional[str] = None
    google_place_id: Optional[str] = None
    source: str = "internal"  # "internal" or "google"


async def fetch_google_places(lat: float, lng: float, radius: int = 2000) -> List[dict]:
    """
    Fetch nearby bars and nightclubs from Google Places API.
    Returns raw place data from Google.
    """
    places = []
    
    # Search for bars
    bar_params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "type": "bar",
        "key": GOOGLE_PLACES_API_KEY
    }
    
    # Search for night clubs
    club_params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "type": "night_club",
        "key": GOOGLE_PLACES_API_KEY
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # Fetch bars
            bar_response = await client.get(GOOGLE_PLACES_URL, params=bar_params, timeout=10.0)
            if bar_response.status_code == 200:
                bar_data = bar_response.json()
                if bar_data.get("status") == "OK":
                    for place in bar_data.get("results", []):
                        places.append({
                            "name": place.get("name"),
                            "place_id": place.get("place_id"),
                            "latitude": place.get("geometry", {}).get("location", {}).get("lat"),
                            "longitude": place.get("geometry", {}).get("location", {}).get("lng"),
                            "address": place.get("vicinity", ""),
                            "type": "Bar",
                            "source": "google"
                        })
                else:
                    print(f"Google Places API bar search: {bar_data.get('status')}")
            
            # Fetch clubs
            club_response = await client.get(GOOGLE_PLACES_URL, params=club_params, timeout=10.0)
            if club_response.status_code == 200:
                club_data = club_response.json()
                if club_data.get("status") == "OK":
                    for place in club_data.get("results", []):
                        # Check if already added from bar search
                        if not any(p.get("place_id") == place.get("place_id") for p in places):
                            places.append({
                                "name": place.get("name"),
                                "place_id": place.get("place_id"),
                                "latitude": place.get("geometry", {}).get("location", {}).get("lat"),
                                "longitude": place.get("geometry", {}).get("location", {}).get("lng"),
                                "address": place.get("vicinity", ""),
                                "type": "Nightclub",
                                "source": "google"
                            })
                else:
                    print(f"Google Places API club search: {club_data.get('status')}")
                    
        except httpx.TimeoutException:
            print("Google Places API timeout")
        except Exception as e:
            print(f"Google Places API error: {e}")
    
    return places


async def save_google_place_to_db(place_data: dict) -> str:
    """
    Save a Google Place to MongoDB if it doesn't exist.
    Returns the MongoDB document ID.
    """
    google_place_id = place_data.get("place_id")
    
    # Check if place already exists by google_place_id
    existing = await places_collection.find_one({"google_place_id": google_place_id})
    
    if existing:
        return str(existing["_id"])
    
    # Create new place document
    new_place = {
        "name": place_data.get("name"),
        "type": place_data.get("type", "Bar"),
        "address": place_data.get("address", ""),
        "latitude": place_data.get("latitude"),
        "longitude": place_data.get("longitude"),
        "google_place_id": google_place_id,
        "source": "google",
        "created_at": datetime.utcnow(),
    }
    
    result = await places_collection.insert_one(new_place)
    print(f"Saved new Google Place: {place_data.get('name')} (ID: {result.inserted_id})")
    return str(result.inserted_id)


@app.get("/api/places/nearby", response_model=List[NearbyPlaceResponse], tags=["Places"])
async def get_nearby_places(
    lat: float,
    lng: float,
    radius: Optional[int] = None,
    limit: Optional[int] = None
):
    """
    Get places near a specific location combining:
    1. Internal database places
    2. Google Places API results (bars and nightclubs)
    
    New Google places are automatically saved to the database.
    Activity levels are calculated for all places.
    """
    # Cleanup expired check-ins first
    await cleanup_expired_checkins()
    
    search_radius = radius or NEARBY_RADIUS_METERS
    max_places = limit or NEARBY_MAX_PLACES
    
    # Step 1: Fetch from Google Places API
    google_places = await fetch_google_places(lat, lng, search_radius)
    print(f"Found {len(google_places)} places from Google Places API")
    
    # Step 2: Save new Google places to database and collect IDs
    google_place_ids = set()
    for gp in google_places:
        if gp.get("latitude") and gp.get("longitude"):
            place_id = await save_google_place_to_db(gp)
            google_place_ids.add(place_id)
    
    # Step 3: Get all places from database within radius
    cursor = places_collection.find({})
    all_db_places = await cursor.to_list(length=200)
    
    # Step 4: Filter by distance and build response
    places_with_distance = []
    
    for p in all_db_places:
        if not p.get("latitude") or not p.get("longitude"):
            continue
            
        distance_m = calculate_distance_meters(lat, lng, p["latitude"], p["longitude"])
        
        # Only include places within radius
        if distance_m <= search_radius:
            places_with_distance.append({
                "place": p,
                "distance_m": distance_m
            })
    
    # Sort by distance (closest first)
    places_with_distance.sort(key=lambda x: x["distance_m"])
    
    # Limit results
    places_with_distance = places_with_distance[:max_places]
    
    # Step 5: Build response with activity data
    result = []
    for item in places_with_distance:
        p = item["place"]
        place_id = str(p["_id"])
        distance_m = item["distance_m"]
        
        # Get REAL activity count
        active_count = await get_active_checkins_count(place_id)
        activity = calculate_activity_level(active_count)
        
        # Format distance
        if distance_m >= 1000:
            distance_str = f"{distance_m / 1000:.1f} km"
        else:
            distance_str = f"{int(distance_m)} m"
        
        result.append(NearbyPlaceResponse(
            id=place_id,
            name=p["name"],
            type=p.get("type", "Bar"),
            latitude=p["latitude"],
            longitude=p["longitude"],
            address=p.get("address"),
            activity_level=activity["level"],
            activity_label=activity["label"],
            is_trending=activity["is_trending"],
            distance=distance_str,
            google_place_id=p.get("google_place_id"),
            source=p.get("source", "internal")
        ))
    
    print(f"Returning {len(result)} nearby places for ({lat}, {lng})")
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


@app.post("/api/places/seed-nearby", tags=["Places"])
async def seed_nearby_places(
    lat: float,
    lng: float,
    current_user: dict = Depends(get_current_user)
):
    """
    Seed sample places near a specific location (for demo/testing).
    Creates 6 sample places within 2km of the given coordinates.
    """
    import random
    
    # Check if there are already places near this location
    existing = await places_collection.count_documents({})
    
    # Sample place templates
    place_types = [
        {"name": "Neon Club", "type": "Nightclub", "desc": "The hottest nightclub in town"},
        {"name": "Skybar Rooftop", "type": "Bar", "desc": "Stunning views and craft cocktails"},
        {"name": "The Social House", "type": "Lounge", "desc": "Relaxed vibes and great conversations"},
        {"name": "Velvet Room", "type": "Club", "desc": "Exclusive club experience"},
        {"name": "Cafe Luna", "type": "Cafe", "desc": "Cozy cafe with live music"},
        {"name": "Pulse Nightclub", "type": "Nightclub", "desc": "EDM and house music paradise"},
        {"name": "The Whiskey Bar", "type": "Bar", "desc": "Premium whiskeys and jazz"},
        {"name": "Rooftop 360", "type": "Bar", "desc": "360 degree city views"},
    ]
    
    created = []
    for i, template in enumerate(place_types):
        # Generate random offset (within 2km)
        lat_offset = random.uniform(-0.015, 0.015)  # ~1.5km
        lng_offset = random.uniform(-0.015, 0.015)
        
        place = {
            "name": f"{template['name']} {existing + i + 1}",
            "type": template["type"],
            "address": f"{100 + i * 10} Main Street",
            "latitude": lat + lat_offset,
            "longitude": lng + lng_offset,
            "description": template["desc"],
            "created_at": datetime.utcnow(),
        }
        
        result = await places_collection.insert_one(place)
        created.append({
            "id": str(result.inserted_id),
            "name": place["name"],
            "latitude": place["latitude"],
            "longitude": place["longitude"]
        })
    
    return {
        "message": f"Created {len(created)} places near ({lat}, {lng})",
        "places": created
    }


# ============== CHECK-IN ENDPOINTS ==============

@app.post("/api/checkins/validate-location", response_model=LocationValidationResponse, tags=["Check-ins"])
async def validate_checkin_location(
    location_data: LocationValidation,
    current_user: dict = Depends(get_current_user)
):
    """
    Validate if user's location allows check-in to a place.
    Call this BEFORE attempting check-in.
    """
    # Validate place exists
    if not ObjectId.is_valid(location_data.place_id):
        raise HTTPException(status_code=400, detail="Invalid place ID")
    
    place = await places_collection.find_one({"_id": ObjectId(location_data.place_id)})
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    # Validate location
    validation = await validate_location_for_checkin(
        user_lat=location_data.user_latitude,
        user_lon=location_data.user_longitude,
        place_lat=place["latitude"],
        place_lon=place["longitude"],
        gps_accuracy=location_data.gps_accuracy,
        is_mocked=location_data.is_mocked
    )
    
    return LocationValidationResponse(
        valid=validation["valid"],
        distance_meters=validation["distance_meters"],
        accuracy_meters=validation["accuracy_meters"],
        within_radius=validation["within_radius"],
        accuracy_acceptable=validation["accuracy_acceptable"],
        error_message=validation["error_message"],
        can_checkin=validation["can_checkin"]
    )


@app.post("/api/checkins", response_model=CheckInResponse, tags=["Check-ins"])
async def check_in(
    checkin_data: CheckInCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Check in to a place with GPS validation.
    Requires valid location data for verified check-ins.
    ANTI-SPAM: If user already has active check-in, UPDATE it instead of creating new.
    """
    # Validate place exists
    if not ObjectId.is_valid(checkin_data.place_id):
        raise HTTPException(status_code=400, detail="Invalid place ID")
    
    place = await places_collection.find_one({"_id": ObjectId(checkin_data.place_id)})
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    user_id = str(current_user["_id"])
    
    # GPS VALIDATION (if location data provided)
    validation_result = "no_gps"
    distance = 0.0
    accuracy = 0.0
    
    if checkin_data.user_latitude is not None and checkin_data.user_longitude is not None:
        # Validate location
        validation = await validate_location_for_checkin(
            user_lat=checkin_data.user_latitude,
            user_lon=checkin_data.user_longitude,
            place_lat=place["latitude"],
            place_lon=place["longitude"],
            gps_accuracy=checkin_data.gps_accuracy or 100,  # Default high if not provided
            is_mocked=checkin_data.is_mocked or False
        )
        
        distance = validation["distance_meters"]
        accuracy = validation["accuracy_meters"]
        
        # Log the attempt
        if not validation["can_checkin"]:
            # Determine failure reason
            if checkin_data.is_mocked:
                validation_result = "failed_mocked"
            elif not validation["accuracy_acceptable"]:
                validation_result = "failed_accuracy"
            else:
                validation_result = "failed_distance"
            
            # Log the failed attempt
            await log_checkin_attempt(user_id, checkin_data.place_id, distance, accuracy, validation_result)
            
            # Return user-friendly error
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "location_invalid",
                    "message": validation["error_message"],
                    "distance_meters": distance,
                    "accuracy_meters": accuracy,
                    "radius_required": CHECKIN_RADIUS_METERS
                }
            )
        
        validation_result = "success"
    
    # ANTI-SPAM: Check if user already has an active check-in
    existing_checkin = await checkins_collection.find_one({
        "user_id": user_id,
        "is_active": True,
        "checked_out_at": None
    })
    
    if existing_checkin:
        # UPDATE existing check-in instead of creating new
        await checkins_collection.update_one(
            {"_id": existing_checkin["_id"]},
            {"$set": {
                "place_id": checkin_data.place_id,
                "place_name": place["name"],
                "checked_in_at": datetime.utcnow(),
                "gps_validated": validation_result == "success",
                "distance_meters": distance if validation_result != "no_gps" else None,
            }}
        )
        
        # Add vibes to user
        await users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$inc": {"vibes": 1}}
        )
        
        # Log successful check-in
        if validation_result != "no_gps":
            await log_checkin_attempt(user_id, checkin_data.place_id, distance, accuracy, validation_result)
        
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
        "gps_validated": validation_result == "success",
        "distance_meters": distance if validation_result != "no_gps" else None,
    }
    
    result = await checkins_collection.insert_one(checkin)
    
    # Add vibes to user
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"vibes": 1}}
    )
    
    # Log successful check-in
    if validation_result != "no_gps":
        await log_checkin_attempt(user_id, checkin_data.place_id, distance, accuracy, validation_result)
    
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
