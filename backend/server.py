import os
import httpx
import time
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from contextlib import asynccontextmanager
from collections import defaultdict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status, Request
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

# ============== RATE LIMITING ==============
# Simple in-memory rate limiter
rate_limit_store: Dict[str, List[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 30  # max requests per window

def check_rate_limit(client_ip: str) -> bool:
    """Check if client is within rate limits"""
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    
    # Clean old entries
    rate_limit_store[client_ip] = [t for t in rate_limit_store[client_ip] if t > window_start]
    
    # Check limit
    if len(rate_limit_store[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    
    rate_limit_store[client_ip].append(now)
    return True

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
vibes_collection = db.vibes  # Vibes sent between users
reviews_collection = db.reviews  # User reviews/ratings
subscriptions_collection = db.subscriptions  # Premium subscriptions


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


# ============== VIBE SYSTEM MODELS ==============

class VibeSend(BaseModel):
    """Model for sending a vibe to another user"""
    to_user_id: str
    message: str = Field(default="Hey! 👋", max_length=100)
    vibe_type: str = Field(default="wave", pattern="^(wave|wink|coffee|drink|dance|custom)$")
    place_id: Optional[str] = None  # Where they saw them


class VibeResponse(BaseModel):
    """Response model for a vibe"""
    id: str
    from_user: dict  # Basic user info
    to_user_id: str
    message: str
    vibe_type: str
    place_id: Optional[str] = None
    place_name: Optional[str] = None
    status: str  # pending, seen, accepted, declined
    created_at: datetime
    expires_at: datetime  # Vibes expire in 24h


class VibeAction(BaseModel):
    """Accept or decline a vibe"""
    action: str = Field(..., pattern="^(accept|decline)$")


# ============== USER AT PLACE MODELS ==============

class UserAtPlace(BaseModel):
    """User visible at a place"""
    id: str
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    intention: Optional[str] = None
    looking_for: Optional[List[str]] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    is_premium: bool = False
    checked_in_at: datetime
    vibe_sent: bool = False  # If current user already sent vibe


class PlaceUsersResponse(BaseModel):
    """Users at a specific place"""
    place_id: str
    place_name: str
    total_users: int
    users: List[UserAtPlace]
    can_see_all: bool  # Premium can see all


# ============== SUBSCRIPTION MODELS ==============

class SubscriptionStatus(BaseModel):
    """User subscription status"""
    is_premium: bool
    plan: str  # free, premium
    vibes_remaining: int
    vibes_reset_at: Optional[datetime] = None
    features: dict


# ============== REVIEW MODELS ==============

class ReviewCreate(BaseModel):
    """Create a review for a user"""
    user_id: str
    rating: int = Field(..., ge=1, le=5)
    tags: List[str] = []  # "friendly", "respectful", "fun", etc.
    comment: Optional[str] = Field(None, max_length=200)


class ReviewResponse(BaseModel):
    id: str
    from_user_name: str
    rating: int
    tags: List[str]
    comment: Optional[str]
    created_at: datetime


# Pre-defined vibe messages
VIBE_MESSAGES = {
    "wave": ["Hey! 👋", "Hi there! 👋", "What's up! 👋"],
    "wink": ["😉", "Caught my eye 😉", "Looking good 😉"],
    "coffee": ["Coffee? ☕", "Let's grab a coffee ☕", "☕ sometime?"],
    "drink": ["Drink? 🍸", "Can I buy you a drink? 🍹", "Cheers! 🥂"],
    "dance": ["Dance? 💃", "Wanna dance? 🕺", "Let's dance! 💃🕺"],
}


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


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    looking_for: Optional[List[str]] = None
    intention: Optional[str] = None


@app.put("/api/auth/profile", response_model=UserResponse, tags=["Auth"])
async def update_profile(profile_data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update user profile"""
    update_dict = {}
    if profile_data.name is not None:
        update_dict["name"] = profile_data.name.strip()
    if profile_data.gender is not None:
        update_dict["gender"] = profile_data.gender
    if profile_data.looking_for is not None:
        update_dict["looking_for"] = profile_data.looking_for
    if profile_data.intention is not None:
        update_dict["intention"] = profile_data.intention
    
    if update_dict:
        await users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$set": update_dict}
        )
    
    updated = await users_collection.find_one({"_id": current_user["_id"]})
    return user_to_response(updated)


@app.delete("/api/auth/account", tags=["Auth"])
async def delete_account(current_user: dict = Depends(get_current_user)):
    """Delete user account and all associated data"""
    user_id = str(current_user["_id"])
    
    # Delete user's check-ins
    await checkins_collection.delete_many({"user_id": user_id})
    
    # Delete check-in logs
    await checkin_logs_collection.delete_many({"user_id": user_id})
    
    # Delete user
    await users_collection.delete_one({"_id": current_user["_id"]})
    
    return {"message": "Account deleted successfully"}


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@app.post("/api/auth/forgot-password", tags=["Auth"])
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset (placeholder - returns success without sending email)"""
    # In production, you would:
    # 1. Generate a reset token
    # 2. Store it with expiry
    # 3. Send email with reset link
    
    # For MVP, we just return success to not leak if email exists
    return {"message": "If this email exists, you will receive reset instructions."}


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


# ============== VIBE SYSTEM ENDPOINTS ==============

@app.get("/api/places/{place_id}/users", tags=["Vibes"])
async def get_users_at_place(
    place_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get users currently checked-in at a place"""
    user_id = str(current_user["_id"])
    is_premium = current_user.get("is_premium", False)
    
    # Get active check-ins at this place
    now = datetime.utcnow()
    checkins = await checkins_collection.find({
        "place_id": place_id,
        "is_active": True,
        "checked_out_at": None,
        "user_id": {"$ne": user_id}  # Exclude current user
    }).sort("checked_in_at", -1).to_list(100)
    
    # Get place info
    place = await places_collection.find_one({"_id": ObjectId(place_id)})
    place_name = place["name"] if place else "Unknown Place"
    
    # Get user details for each check-in
    users = []
    for checkin in checkins:
        user = await users_collection.find_one({"_id": ObjectId(checkin["user_id"])})
        if user and user.get("is_visible", True):
            # Check if current user already sent a vibe
            vibe_sent = await vibes_collection.find_one({
                "from_user_id": user_id,
                "to_user_id": str(user["_id"]),
                "expires_at": {"$gt": now}
            }) is not None
            
            users.append({
                "id": str(user["_id"]),
                "name": user.get("name", "Anonymous"),
                "age": user.get("age"),
                "gender": user.get("gender"),
                "intention": user.get("intention"),
                "looking_for": user.get("looking_for", []),
                "bio": user.get("bio", ""),
                "photo_url": user.get("photo_url"),
                "is_premium": user.get("is_premium", False),
                "checked_in_at": checkin["checked_in_at"],
                "vibe_sent": vibe_sent
            })
    
    # Basic users can only see 5 profiles
    total_users = len(users)
    if not is_premium and len(users) > 5:
        users = users[:5]
    
    return {
        "place_id": place_id,
        "place_name": place_name,
        "total_users": total_users,
        "users": users,
        "can_see_all": is_premium
    }


@app.post("/api/vibes/send", tags=["Vibes"])
async def send_vibe(
    vibe: VibeSend,
    current_user: dict = Depends(get_current_user)
):
    """Send a vibe to another user"""
    user_id = str(current_user["_id"])
    is_premium = current_user.get("is_premium", False)
    now = datetime.utcnow()
    
    # Check if target user exists
    target_user = await users_collection.find_one({"_id": ObjectId(vibe.to_user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check rate limits for basic users
    if not is_premium:
        # Count vibes sent in last 24 hours
        day_ago = now - timedelta(hours=24)
        vibes_today = await vibes_collection.count_documents({
            "from_user_id": user_id,
            "created_at": {"$gt": day_ago}
        })
        
        if vibes_today >= 5:
            raise HTTPException(
                status_code=429, 
                detail="Daily vibe limit reached (5). Upgrade to Premium for unlimited vibes!"
            )
        
        # Check 2-hour cooldown
        two_hours_ago = now - timedelta(hours=2)
        recent_vibe = await vibes_collection.find_one({
            "from_user_id": user_id,
            "created_at": {"$gt": two_hours_ago}
        })
        
        if recent_vibe:
            raise HTTPException(
                status_code=429, 
                detail="Please wait 2 hours between vibes. Upgrade to Premium for no limits!"
            )
    
    # Check if already sent vibe to this user (not expired)
    existing_vibe = await vibes_collection.find_one({
        "from_user_id": user_id,
        "to_user_id": vibe.to_user_id,
        "expires_at": {"$gt": now}
    })
    
    if existing_vibe:
        raise HTTPException(status_code=400, detail="You already sent a vibe to this person")
    
    # Get place name if place_id provided
    place_name = None
    if vibe.place_id:
        place = await places_collection.find_one({"_id": ObjectId(vibe.place_id)})
        place_name = place["name"] if place else None
    
    # Create the vibe
    vibe_doc = {
        "from_user_id": user_id,
        "from_user_name": current_user.get("name", "Someone"),
        "to_user_id": vibe.to_user_id,
        "message": vibe.message,
        "vibe_type": vibe.vibe_type,
        "place_id": vibe.place_id,
        "place_name": place_name,
        "status": "pending",
        "created_at": now,
        "expires_at": now + timedelta(hours=24)  # Vibes expire in 24h
    }
    
    result = await vibes_collection.insert_one(vibe_doc)
    
    # Update user's vibe count
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"vibes_sent": 1}}
    )
    
    return {
        "id": str(result.inserted_id),
        "from_user": {
            "id": user_id,
            "name": current_user.get("name", "Someone")
        },
        "to_user_id": vibe.to_user_id,
        "message": vibe.message,
        "vibe_type": vibe.vibe_type,
        "place_id": vibe.place_id,
        "place_name": place_name,
        "status": "pending",
        "created_at": now,
        "expires_at": now + timedelta(hours=24)
    }


@app.get("/api/vibes/received", tags=["Vibes"])
async def get_received_vibes(
    current_user: dict = Depends(get_current_user)
):
    """Get vibes received by current user"""
    user_id = str(current_user["_id"])
    now = datetime.utcnow()
    
    # Get non-expired vibes
    vibes = await vibes_collection.find({
        "to_user_id": user_id,
        "expires_at": {"$gt": now}
    }).sort("created_at", -1).to_list(50)
    
    result = []
    for v in vibes:
        # Get sender info
        sender = await users_collection.find_one({"_id": ObjectId(v["from_user_id"])})
        result.append({
            "id": str(v["_id"]),
            "from_user": {
                "id": v["from_user_id"],
                "name": v.get("from_user_name", "Someone"),
                "photo_url": sender.get("photo_url") if sender else None,
                "age": sender.get("age") if sender else None
            },
            "message": v["message"],
            "vibe_type": v["vibe_type"],
            "place_name": v.get("place_name"),
            "status": v["status"],
            "created_at": v["created_at"],
            "expires_at": v["expires_at"]
        })
    
    return result


@app.get("/api/vibes/sent", tags=["Vibes"])
async def get_sent_vibes(
    current_user: dict = Depends(get_current_user)
):
    """Get vibes sent by current user"""
    user_id = str(current_user["_id"])
    now = datetime.utcnow()
    
    vibes = await vibes_collection.find({
        "from_user_id": user_id,
        "expires_at": {"$gt": now}
    }).sort("created_at", -1).to_list(50)
    
    result = []
    for v in vibes:
        target = await users_collection.find_one({"_id": ObjectId(v["to_user_id"])})
        result.append({
            "id": str(v["_id"]),
            "to_user": {
                "id": v["to_user_id"],
                "name": target.get("name", "Someone") if target else "Someone",
            },
            "message": v["message"],
            "vibe_type": v["vibe_type"],
            "place_name": v.get("place_name"),
            "status": v["status"],
            "created_at": v["created_at"],
            "expires_at": v["expires_at"]
        })
    
    return result


@app.post("/api/vibes/{vibe_id}/respond", tags=["Vibes"])
async def respond_to_vibe(
    vibe_id: str,
    action: VibeAction,
    current_user: dict = Depends(get_current_user)
):
    """Accept or decline a vibe"""
    user_id = str(current_user["_id"])
    now = datetime.utcnow()
    
    # Find the vibe
    vibe = await vibes_collection.find_one({
        "_id": ObjectId(vibe_id),
        "to_user_id": user_id,
        "expires_at": {"$gt": now}
    })
    
    if not vibe:
        raise HTTPException(status_code=404, detail="Vibe not found or expired")
    
    if vibe["status"] != "pending":
        raise HTTPException(status_code=400, detail="Vibe already responded to")
    
    # Update vibe status
    new_status = "accepted" if action.action == "accept" else "declined"
    await vibes_collection.update_one(
        {"_id": ObjectId(vibe_id)},
        {"$set": {"status": new_status, "responded_at": now}}
    )
    
    # If accepted, update connection rates for both users
    if action.action == "accept":
        await users_collection.update_one(
            {"_id": ObjectId(vibe["from_user_id"])},
            {"$inc": {"connections": 1, "vibes_accepted": 1}}
        )
        await users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$inc": {"connections": 1}}
        )
    
    return {"status": new_status, "vibe_id": vibe_id}


@app.get("/api/vibes/stats", tags=["Vibes"])
async def get_vibe_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get user's vibe statistics and limits"""
    user_id = str(current_user["_id"])
    is_premium = current_user.get("is_premium", False)
    now = datetime.utcnow()
    day_ago = now - timedelta(hours=24)
    
    # Count vibes sent today
    vibes_today = await vibes_collection.count_documents({
        "from_user_id": user_id,
        "created_at": {"$gt": day_ago}
    })
    
    # Get last vibe time for cooldown
    last_vibe = await vibes_collection.find_one(
        {"from_user_id": user_id},
        sort=[("created_at", -1)]
    )
    
    # Calculate next available vibe time for basic users
    next_vibe_at = None
    if not is_premium and last_vibe:
        cooldown_end = last_vibe["created_at"] + timedelta(hours=2)
        if cooldown_end > now:
            next_vibe_at = cooldown_end
    
    return {
        "is_premium": is_premium,
        "vibes_sent_today": vibes_today,
        "vibes_remaining": "unlimited" if is_premium else max(0, 5 - vibes_today),
        "daily_limit": "unlimited" if is_premium else 5,
        "next_vibe_at": next_vibe_at,
        "cooldown_hours": 0 if is_premium else 2
    }


# ============== USER PROFILE ENDPOINTS ==============

@app.get("/api/users/{user_id}/profile", tags=["Users"])
async def get_user_profile(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get another user's public profile"""
    viewer_id = str(current_user["_id"])
    is_premium = current_user.get("is_premium", False)
    
    # Get target user
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Log profile view (unless viewer is premium with ghost mode)
    if not is_premium:
        await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$push": {
                "profile_views": {
                    "viewer_id": viewer_id,
                    "viewer_name": current_user.get("name", "Someone"),
                    "viewed_at": datetime.utcnow()
                }
            }}
        )
    
    # Get user's reviews
    reviews = await reviews_collection.find({
        "user_id": user_id
    }).sort("created_at", -1).limit(10).to_list(10)
    
    # Calculate average rating
    total_rating = sum(r.get("rating", 0) for r in reviews)
    avg_rating = total_rating / len(reviews) if reviews else 0
    
    # Get recent places visited
    recent_checkins = await checkins_collection.find({
        "user_id": user_id
    }).sort("checked_in_at", -1).limit(5).to_list(5)
    
    return {
        "id": str(user["_id"]),
        "name": user.get("name", "Anonymous"),
        "age": user.get("age"),
        "gender": user.get("gender"),
        "bio": user.get("bio", ""),
        "photo_url": user.get("photo_url"),
        "intention": user.get("intention"),
        "looking_for": user.get("looking_for", []),
        "is_premium": user.get("is_premium", False),
        "stats": {
            "total_checkins": await checkins_collection.count_documents({"user_id": user_id}),
            "connections": user.get("connections", 0),
            "avg_rating": round(avg_rating, 1),
            "review_count": len(reviews)
        },
        "recent_places": [
            {"name": c["place_name"], "date": c["checked_in_at"]}
            for c in recent_checkins
        ],
        "reviews": [
            {
                "id": str(r["_id"]),
                "from_user_name": r.get("from_user_name", "Anonymous"),
                "rating": r["rating"],
                "tags": r.get("tags", []),
                "comment": r.get("comment"),
                "created_at": r["created_at"]
            }
            for r in reviews
        ]
    }


@app.get("/api/users/me/views", tags=["Users"])
async def get_profile_views(
    current_user: dict = Depends(get_current_user)
):
    """Get who viewed my profile (basic users see this, premium don't leave traces)"""
    views = current_user.get("profile_views", [])
    
    # Only show views from last 7 days
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_views = [
        v for v in views 
        if v.get("viewed_at", datetime.min) > week_ago
    ][-20:]  # Last 20 views
    
    return {
        "views": recent_views,
        "total_views_week": len(recent_views)
    }


# ============== REVIEW ENDPOINTS ==============

@app.post("/api/reviews", tags=["Reviews"])
async def create_review(
    review: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """Leave a review for a user you've connected with"""
    reviewer_id = str(current_user["_id"])
    
    # Can only review users you've had mutual vibes with
    # For MVP, we'll allow reviewing anyone you've sent/received vibes from
    vibe = await vibes_collection.find_one({
        "$or": [
            {"from_user_id": reviewer_id, "to_user_id": review.user_id, "status": "accepted"},
            {"from_user_id": review.user_id, "to_user_id": reviewer_id, "status": "accepted"}
        ]
    })
    
    if not vibe:
        raise HTTPException(
            status_code=403, 
            detail="You can only review people you've connected with"
        )
    
    # Check if already reviewed
    existing = await reviews_collection.find_one({
        "from_user_id": reviewer_id,
        "user_id": review.user_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this person")
    
    review_doc = {
        "user_id": review.user_id,
        "from_user_id": reviewer_id,
        "from_user_name": current_user.get("name", "Anonymous"),
        "rating": review.rating,
        "tags": review.tags,
        "comment": review.comment,
        "created_at": datetime.utcnow()
    }
    
    result = await reviews_collection.insert_one(review_doc)
    
    return {
        "id": str(result.inserted_id),
        "message": "Review submitted successfully"
    }


# ============== BUSINESS PARTNER MODELS ==============

class BusinessRegister(BaseModel):
    """Register a business/venue"""
    name: str = Field(..., min_length=2, max_length=100)
    type: str = Field(default="Bar")  # Bar, Club, Restaurant, Cafe, etc.
    address: str = Field(..., min_length=5, max_length=200)
    latitude: float
    longitude: float
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    description: Optional[str] = Field(None, max_length=500)


class BusinessResponse(BaseModel):
    """Business response with QR data"""
    id: str
    name: str
    type: str
    address: str
    latitude: float
    longitude: float
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    qr_code_data: str  # Data to encode in QR: seeme://place/{id}
    created_at: datetime
    is_active: bool


class QRCheckIn(BaseModel):
    """Check-in via QR code scan"""
    qr_data: str  # The scanned QR data: seeme://place/{place_id}
    vibe_id: Optional[str] = None  # User's chosen vibe for this check-in


class DefaultVibeUpdate(BaseModel):
    """Update user's default vibe"""
    vibe_id: str  # The vibe type ID from constants


# ============== BUSINESS PARTNER ENDPOINTS ==============

# Collection for businesses
businesses_collection = db.businesses


@app.post("/api/business/register", response_model=BusinessResponse, tags=["Business"])
async def register_business(
    business_data: BusinessRegister,
    current_user: dict = Depends(get_current_user)
):
    """
    Register a new business venue.
    Any user can register a business (for MVP).
    """
    # Check if business name already exists at similar location
    existing = await businesses_collection.find_one({
        "name": {"$regex": f"^{business_data.name}$", "$options": "i"},
        "latitude": {"$gte": business_data.latitude - 0.001, "$lte": business_data.latitude + 0.001},
        "longitude": {"$gte": business_data.longitude - 0.001, "$lte": business_data.longitude + 0.001},
    })
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="A business with this name already exists at this location"
        )
    
    business_doc = {
        "name": business_data.name,
        "type": business_data.type,
        "address": business_data.address,
        "latitude": business_data.latitude,
        "longitude": business_data.longitude,
        "phone": business_data.phone,
        "email": business_data.email,
        "description": business_data.description,
        "owner_user_id": str(current_user["_id"]),
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    
    result = await businesses_collection.insert_one(business_doc)
    business_id = str(result.inserted_id)
    
    # Also create a place entry for this business
    place_doc = {
        "name": business_data.name,
        "type": business_data.type,
        "address": business_data.address,
        "latitude": business_data.latitude,
        "longitude": business_data.longitude,
        "description": business_data.description,
        "business_id": business_id,
        "is_partner": True,
        "created_at": datetime.utcnow(),
    }
    
    place_result = await places_collection.insert_one(place_doc)
    place_id = str(place_result.inserted_id)
    
    # Update business with place_id
    await businesses_collection.update_one(
        {"_id": result.inserted_id},
        {"$set": {"place_id": place_id}}
    )
    
    return BusinessResponse(
        id=business_id,
        name=business_data.name,
        type=business_data.type,
        address=business_data.address,
        latitude=business_data.latitude,
        longitude=business_data.longitude,
        phone=business_data.phone,
        email=business_data.email,
        description=business_data.description,
        qr_code_data=f"seeme://place/{place_id}",
        created_at=business_doc["created_at"],
        is_active=True,
    )


@app.get("/api/business/my-businesses", tags=["Business"])
async def get_my_businesses(current_user: dict = Depends(get_current_user)):
    """Get businesses registered by current user"""
    user_id = str(current_user["_id"])
    
    cursor = businesses_collection.find({"owner_user_id": user_id})
    businesses = await cursor.to_list(length=50)
    
    result = []
    for b in businesses:
        place_id = b.get("place_id", str(b["_id"]))
        result.append({
            "id": str(b["_id"]),
            "name": b["name"],
            "type": b["type"],
            "address": b["address"],
            "latitude": b["latitude"],
            "longitude": b["longitude"],
            "phone": b.get("phone"),
            "email": b.get("email"),
            "description": b.get("description"),
            "qr_code_data": f"seeme://place/{place_id}",
            "place_id": place_id,
            "created_at": b["created_at"],
            "is_active": b.get("is_active", True),
        })
    
    return result


@app.get("/api/business/{business_id}/qr", tags=["Business"])
async def get_business_qr(
    business_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get QR code data for a business"""
    try:
        business = await businesses_collection.find_one({"_id": ObjectId(business_id)})
    except:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    place_id = business.get("place_id", business_id)
    
    return {
        "qr_data": f"seeme://place/{place_id}",
        "business_name": business["name"],
        "place_id": place_id,
    }


# ============== QR CHECK-IN ENDPOINT ==============

@app.post("/api/checkin/qr", tags=["Check-in"])
async def qr_checkin(
    qr_data: QRCheckIn,
    current_user: dict = Depends(get_current_user)
):
    """
    Check-in via QR code scan.
    QR data format: seeme://place/{place_id}
    """
    # Parse QR data
    if not qr_data.qr_data.startswith("seeme://place/"):
        raise HTTPException(
            status_code=400, 
            detail="Invalid QR code. This doesn't look like a SEE ME QR code."
        )
    
    place_id = qr_data.qr_data.replace("seeme://place/", "")
    
    try:
        place = await places_collection.find_one({"_id": ObjectId(place_id)})
    except:
        raise HTTPException(status_code=404, detail="Place not found")
    
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    user_id = str(current_user["_id"])
    
    # Check for active check-in at same place
    existing = await checkins_collection.find_one({
        "user_id": user_id,
        "place_id": place_id,
        "is_active": True
    })
    
    if existing:
        return {
            "message": "Already checked in here",
            "checkin_id": str(existing["_id"]),
            "place_name": place["name"],
            "is_new": False,
        }
    
    # Checkout from any other place
    await checkins_collection.update_many(
        {"user_id": user_id, "is_active": True},
        {"$set": {"is_active": False, "checked_out_at": datetime.utcnow()}}
    )
    
    # Create new check-in
    checkin_doc = {
        "user_id": user_id,
        "place_id": place_id,
        "place_name": place["name"],
        "vibe_id": qr_data.vibe_id,  # The vibe user chose
        "checked_in_at": datetime.utcnow(),
        "is_active": True,
        "method": "qr_scan",  # Track that this was a QR check-in
    }
    
    result = await checkins_collection.insert_one(checkin_doc)
    
    # Update user's current vibe if provided
    if qr_data.vibe_id:
        await users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"current_vibe_id": qr_data.vibe_id}}
        )
    
    return {
        "message": "Checked in successfully!",
        "checkin_id": str(result.inserted_id),
        "place_name": place["name"],
        "place_id": place_id,
        "is_new": True,
        "is_partner": place.get("is_partner", False),
    }


# ============== DEFAULT VIBE ENDPOINTS ==============

@app.put("/api/user/default-vibe", tags=["User"])
async def update_default_vibe(
    vibe_data: DefaultVibeUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user's default vibe for check-ins"""
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"default_vibe_id": vibe_data.vibe_id}}
    )
    
    return {
        "message": "Default vibe updated",
        "vibe_id": vibe_data.vibe_id,
    }


@app.get("/api/user/default-vibe", tags=["User"])
async def get_default_vibe(current_user: dict = Depends(get_current_user)):
    """Get user's default vibe"""
    return {
        "vibe_id": current_user.get("default_vibe_id"),
        "current_vibe_id": current_user.get("current_vibe_id"),
    }


# ============== HEALTH CHECK ==============

@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "SEE ME API",
        "version": "2.1.0",
        "timestamp": datetime.utcnow().isoformat(),
        "features": {
            "real_activity": True,
            "anti_spam": True,
            "auto_cleanup": True,
            "qr_checkin": True,
            "business_partners": True,
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
