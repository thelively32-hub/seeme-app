import os
import httpx
import time
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from contextlib import asynccontextmanager
from collections import defaultdict
from enum import Enum

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from passlib.context import CryptContext
from jose import JWTError, jwt

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

load_dotenv()

# ============== FIREBASE CONFIGURATION ==============
# Initialize Firebase Admin SDK
FIREBASE_CONFIG = {
    "apiKey": os.getenv("FIREBASE_API_KEY", "AIzaSyDmH6FKtn9loWwyqz0zOiKrssdCXfz7Ceo"),
    "authDomain": "see-me-app-5e487.firebaseapp.com",
    "projectId": "see-me-app-5e487",
    "storageBucket": "see-me-app-5e487.firebasestorage.app",
    "messagingSenderId": "5904630206",
    "appId": "1:5904630206:web:feecd66c5bcb713586f9ef"
}

# Initialize Firebase Admin (without credentials file - uses project ID only for token verification)
try:
    firebase_admin.get_app()
except ValueError:
    # No credentials file needed for just verifying tokens
    firebase_admin.initialize_app(options={"projectId": FIREBASE_CONFIG["projectId"]})

# Google Places API Configuration
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "AIzaSyCPKT55qhr18vD63d91A5Ys6NoZvsq3D0s")
GOOGLE_PLACES_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

# ============== CLOUDINARY CONFIGURATION ==============
import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "dxgtxlgyr"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "261364693139651"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "QQQgc_FFx1_hykFaYhbE3a66-9U"),
    secure=True
)

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
CHECKIN_RADIUS_METERS = int(os.getenv("CHECKIN_RADIUS", "50"))
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
chats_collection = db.chats  # Temporary chats (24h)
messages_collection = db.messages  # Chat messages
reports_collection = db.reports  # User reports
invitations_collection = db.invitations  # "Quién para..." invitations
blocks_collection = db.blocks  # Blocked users
safety_contacts_collection = db.safety_contacts  # Emergency contacts
verifications_collection = db.verifications  # Photo verifications


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
    intention: str = Field(..., pattern="^(friends|friendship|date|dating|casual)$")


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
    is_verified: bool = False
    # Presence system
    is_present: bool = False  # True if actively at a checked-in location
    status_message: Optional[str] = None  # "On my way to...", custom message
    ghost_mode: bool = False  # Premium: hide from radar/map
    current_place_id: Optional[str] = None
    current_place_name: Optional[str] = None
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


# ============== CHAT MODELS ==============

class ChatMessage(BaseModel):
    """A message in a chat"""
    id: str
    chat_id: str
    sender_id: str
    sender_name: str
    content: str
    created_at: datetime


class ChatResponse(BaseModel):
    """A chat between two users"""
    id: str
    participants: List[dict]  # [{id, name, photo_url}]
    vibe_type: Optional[str] = None
    last_message: Optional[dict] = None
    unread_count: int = 0
    created_at: datetime
    expires_at: datetime
    is_expired: bool = False


class ChatDetailResponse(BaseModel):
    """Detailed chat with messages"""
    id: str
    participants: List[dict]
    vibe_type: Optional[str] = None
    messages: List[ChatMessage]
    created_at: datetime
    expires_at: datetime
    time_remaining_seconds: int
    is_expired: bool = False


class SendMessage(BaseModel):
    """Send a message in a chat"""
    content: str = Field(default="", max_length=500)
    image_url: Optional[str] = None
    message_type: str = Field(default="text", pattern="^(text|image)$")


# ============== SAFETY & SECURITY MODELS ==============

class ReportReason(str, Enum):
    """Reasons for reporting a user"""
    INAPPROPRIATE_CONTENT = "inappropriate_content"
    HARASSMENT = "harassment"
    FAKE_PROFILE = "fake_profile"
    SPAM = "spam"
    UNDERAGE = "underage"
    THREATENING = "threatening"
    OTHER = "other"


class ReportUser(BaseModel):
    """Report a user"""
    user_id: str
    reason: ReportReason
    details: Optional[str] = Field(None, max_length=500)


class BlockUser(BaseModel):
    """Block a user"""
    user_id: str


class SafetyContact(BaseModel):
    """Emergency contact for safety"""
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=10, max_length=20)
    relationship: Optional[str] = Field(None, max_length=50)  # e.g., "Friend", "Family"


class ShareLocation(BaseModel):
    """Share current location/date info"""
    contact_name: str
    contact_phone: str
    place_name: str
    notes: Optional[str] = None
    duration_hours: int = Field(default=3, ge=1, le=12)


class PhotoVerification(BaseModel):
    """Submit photo for verification"""
    selfie_base64: str  # Base64 encoded selfie


# ============== PRESENCE & STATUS MODELS ==============

# Suggested status messages
SUGGESTED_STATUS_MESSAGES = [
    {"id": "on_my_way", "text": "On my way 🚗", "textEs": "En camino 🚗"},
    {"id": "arriving_soon", "text": "Arriving soon ⏰", "textEs": "Llegando pronto ⏰"},
    {"id": "just_arrived", "text": "Just arrived! 📍", "textEs": "Acabo de llegar! 📍"},
    {"id": "looking_around", "text": "Looking around 👀", "textEs": "Mirando por aquí 👀"},
    {"id": "at_the_bar", "text": "At the bar 🍸", "textEs": "En la barra 🍸"},
    {"id": "on_the_dance_floor", "text": "On the dance floor 💃", "textEs": "En la pista 💃"},
    {"id": "chilling", "text": "Just chilling 😎", "textEs": "Relajándome 😎"},
    {"id": "ready_to_meet", "text": "Ready to meet people ✨", "textEs": "Listo para conocer gente ✨"},
]


class UpdateStatusMessage(BaseModel):
    """Update user's status message"""
    message: Optional[str] = Field(None, max_length=100)
    suggested_id: Optional[str] = None  # Use a suggested message by ID


class UpdateGhostMode(BaseModel):
    """Toggle ghost mode (Premium only)"""
    enabled: bool


class PresenceUpdate(BaseModel):
    """Update presence status based on GPS"""
    latitude: float
    longitude: float
    accuracy: Optional[float] = None


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
        is_verified=user.get("is_verified", False),
        is_present=user.get("is_present", False),
        status_message=user.get("status_message"),
        ghost_mode=user.get("ghost_mode", False),
        current_place_id=user.get("current_place_id"),
        current_place_name=user.get("current_place_name"),
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


# ============== FIREBASE PHONE AUTH ==============

class FirebaseAuthRequest(BaseModel):
    id_token: str
    phone_number: str

class FirebaseAuthResponse(BaseModel):
    access_token: str
    user: UserResponse
    is_new_user: bool


@app.post("/api/auth/firebase", response_model=FirebaseAuthResponse, tags=["Auth"])
async def firebase_phone_auth(auth_data: FirebaseAuthRequest):
    """Authenticate user via Firebase Phone Auth"""
    try:
        # Verify the Firebase ID token
        decoded_token = firebase_auth.verify_id_token(auth_data.id_token)
        firebase_uid = decoded_token['uid']
        phone_number = decoded_token.get('phone_number') or auth_data.phone_number
        
    except firebase_admin.exceptions.FirebaseError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")
    
    # Check if user exists by Firebase UID or phone number
    user = await users_collection.find_one({
        "$or": [
            {"firebase_uid": firebase_uid},
            {"phone_number": phone_number}
        ]
    })
    
    is_new_user = False
    
    if not user:
        # Create new user
        is_new_user = True
        user_dict = {
            "firebase_uid": firebase_uid,
            "phone_number": phone_number,
            "name": f"User_{phone_number[-4:]}",  # Temporary name
            "email": None,
            "password": None,  # No password for phone auth users
            "age": None,
            "gender": None,
            "looking_for": None,
            "intention": None,
            "vibes": 0,
            "connection_rate": 0.0,
            "is_premium": False,
            "created_at": datetime.utcnow(),
            "auth_provider": "firebase_phone",
        }
        
        result = await users_collection.insert_one(user_dict)
        user_dict["_id"] = result.inserted_id
        user = user_dict
    else:
        # Update Firebase UID if not set (migration from old system)
        if not user.get("firebase_uid"):
            await users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"firebase_uid": firebase_uid, "auth_provider": "firebase_phone"}}
            )
    
    # Create our JWT token
    token = create_access_token(data={"sub": str(user["_id"])})
    
    return FirebaseAuthResponse(
        access_token=token,
        user=user_to_response(user),
        is_new_user=is_new_user
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
    bio: Optional[str] = Field(None, max_length=500)
    photo_url: Optional[str] = None
    age: Optional[int] = Field(None, ge=18, le=100)
    status_message: Optional[str] = Field(None, max_length=100)


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
    if profile_data.bio is not None:
        update_dict["bio"] = profile_data.bio.strip()
    if profile_data.photo_url is not None:
        update_dict["photo_url"] = profile_data.photo_url
    if profile_data.age is not None:
        update_dict["age"] = profile_data.age
    if profile_data.status_message is not None:
        update_dict["status_message"] = profile_data.status_message.strip() if profile_data.status_message else None
    
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
    
    # Add vibes to user and UPDATE PRESENCE
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {
            "$inc": {"vibes": 1},
            "$set": {
                "is_present": True,
                "current_place_id": checkin_data.place_id,
                "current_place_name": place["name"],
                "last_checkin_at": datetime.utcnow()
            }
        }
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
    
    # Clear presence status
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "is_present": False,
            "current_place_id": None,
            "current_place_name": None
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
    
    chat_id = None
    
    # If accepted, update connection rates for both users AND create a chat
    if action.action == "accept":
        await users_collection.update_one(
            {"_id": ObjectId(vibe["from_user_id"])},
            {"$inc": {"connections": 1, "vibes_accepted": 1}}
        )
        await users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$inc": {"connections": 1}}
        )
        
        # Create a 24-hour chat between the two users
        from_user = await users_collection.find_one({"_id": ObjectId(vibe["from_user_id"])})
        chat_doc = {
            "participants": [
                {
                    "id": vibe["from_user_id"],
                    "name": from_user.get("name", "User") if from_user else "User",
                    "photo_url": from_user.get("photo_url") if from_user else None,
                },
                {
                    "id": user_id,
                    "name": current_user.get("name", "User"),
                    "photo_url": current_user.get("photo_url"),
                }
            ],
            "participant_ids": [vibe["from_user_id"], user_id],
            "vibe_id": vibe_id,
            "vibe_type": vibe.get("vibe_type", "wave"),
            "created_at": now,
            "expires_at": now + timedelta(hours=24),
            "last_message_at": now,
            "is_active": True,
        }
        result = await chats_collection.insert_one(chat_doc)
        chat_id = str(result.inserted_id)
    
    return {"status": new_status, "vibe_id": vibe_id, "chat_id": chat_id}


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


# ============== CHAT ENDPOINTS ==============

@app.get("/api/chats", tags=["Chat"])
async def get_my_chats(
    current_user: dict = Depends(get_current_user)
):
    """Get all active chats for the current user"""
    user_id = str(current_user["_id"])
    now = datetime.utcnow()
    
    # Find all active chats for this user
    cursor = chats_collection.find({
        "participant_ids": user_id,
        "expires_at": {"$gt": now},
        "is_active": True
    }).sort("last_message_at", -1)
    
    chats = await cursor.to_list(length=50)
    
    result = []
    for chat in chats:
        # Get the other participant
        other_participant = None
        for p in chat["participants"]:
            if p["id"] != user_id:
                other_participant = p
                break
        
        # Get last message
        last_msg = await messages_collection.find_one(
            {"chat_id": str(chat["_id"])},
            sort=[("created_at", -1)]
        )
        
        # Count unread messages (simplified - all messages not from this user since last read)
        unread = await messages_collection.count_documents({
            "chat_id": str(chat["_id"]),
            "sender_id": {"$ne": user_id},
            "read": {"$ne": True}
        })
        
        time_remaining = int((chat["expires_at"] - now).total_seconds())
        
        result.append({
            "id": str(chat["_id"]),
            "other_user": other_participant,
            "vibe_type": chat.get("vibe_type"),
            "last_message": {
                "content": last_msg["content"][:50] if last_msg else None,
                "sender_id": last_msg["sender_id"] if last_msg else None,
                "created_at": last_msg["created_at"] if last_msg else None
            } if last_msg else None,
            "unread_count": unread,
            "created_at": chat["created_at"],
            "expires_at": chat["expires_at"],
            "time_remaining_seconds": max(0, time_remaining),
            "time_remaining_hours": max(0, round(time_remaining / 3600, 1)),
        })
    
    return result


@app.get("/api/chats/{chat_id}", tags=["Chat"])
async def get_chat(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific chat with all messages"""
    user_id = str(current_user["_id"])
    now = datetime.utcnow()
    
    try:
        chat = await chats_collection.find_one({
            "_id": ObjectId(chat_id),
            "participant_ids": user_id
        })
    except Exception:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check if expired
    is_expired = chat["expires_at"] < now
    time_remaining = int((chat["expires_at"] - now).total_seconds())
    
    # Get all messages
    cursor = messages_collection.find({"chat_id": chat_id}).sort("created_at", 1)
    messages = await cursor.to_list(length=500)
    
    # Mark messages as read
    await messages_collection.update_many(
        {"chat_id": chat_id, "sender_id": {"$ne": user_id}},
        {"$set": {"read": True}}
    )
    
    # Get the other participant
    other_participant = None
    for p in chat["participants"]:
        if p["id"] != user_id:
            other_participant = p
            break
    
    return {
        "id": str(chat["_id"]),
        "participants": chat["participants"],
        "other_user": other_participant,
        "vibe_type": chat.get("vibe_type"),
        "messages": [
            {
                "id": str(m["_id"]),
                "chat_id": chat_id,
                "sender_id": m["sender_id"],
                "sender_name": m["sender_name"],
                "content": m.get("content", ""),
                "image_url": m.get("image_url"),
                "message_type": m.get("message_type", "text"),
                "created_at": m["created_at"],
                "is_mine": m["sender_id"] == user_id
            }
            for m in messages
        ] if not is_expired else [],
        "created_at": chat["created_at"],
        "expires_at": chat["expires_at"],
        "time_remaining_seconds": max(0, time_remaining),
        "time_remaining_hours": max(0, round(time_remaining / 3600, 1)),
        "is_expired": is_expired,
    }


@app.post("/api/chats/{chat_id}/messages", tags=["Chat"])
async def send_message(
    chat_id: str,
    message: SendMessage,
    current_user: dict = Depends(get_current_user)
):
    """Send a message in a chat (text or image)"""
    user_id = str(current_user["_id"])
    now = datetime.utcnow()
    
    # Validate message has content
    if message.message_type == "text" and not message.content.strip():
        raise HTTPException(status_code=400, detail="Message content is required")
    if message.message_type == "image" and not message.image_url:
        raise HTTPException(status_code=400, detail="Image URL is required")
    
    try:
        chat = await chats_collection.find_one({
            "_id": ObjectId(chat_id),
            "participant_ids": user_id,
            "is_active": True
        })
    except Exception:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check if expired
    if chat["expires_at"] < now:
        raise HTTPException(status_code=400, detail="This chat has expired")
    
    # Create message
    msg_doc = {
        "chat_id": chat_id,
        "sender_id": user_id,
        "sender_name": current_user.get("name", "User"),
        "content": message.content or "",
        "image_url": message.image_url,
        "message_type": message.message_type,
        "created_at": now,
        "read": False
    }
    
    result = await messages_collection.insert_one(msg_doc)
    
    # Update chat's last message time
    await chats_collection.update_one(
        {"_id": ObjectId(chat_id)},
        {"$set": {"last_message_at": now}}
    )
    
    return {
        "id": str(result.inserted_id),
        "chat_id": chat_id,
        "sender_id": user_id,
        "sender_name": current_user.get("name", "User"),
        "content": message.content or "",
        "image_url": message.image_url,
        "message_type": message.message_type,
        "created_at": now,
    }


@app.get("/api/chats/unread/count", tags=["Chat"])
async def get_unread_count(
    current_user: dict = Depends(get_current_user)
):
    """Get total unread message count across all chats"""
    user_id = str(current_user["_id"])
    now = datetime.utcnow()
    
    # Get all active chat IDs for this user
    cursor = chats_collection.find({
        "participant_ids": user_id,
        "expires_at": {"$gt": now},
        "is_active": True
    })
    chats = await cursor.to_list(length=100)
    chat_ids = [str(c["_id"]) for c in chats]
    
    if not chat_ids:
        return {"unread_count": 0, "active_chats": 0}
    
    # Count unread messages
    unread = await messages_collection.count_documents({
        "chat_id": {"$in": chat_ids},
        "sender_id": {"$ne": user_id},
        "read": {"$ne": True}
    })
    
    return {
        "unread_count": unread,
        "active_chats": len(chat_ids)
    }


# ============== IMAGE UPLOAD ENDPOINT ==============

class ImageUploadRequest(BaseModel):
    """Request for uploading an image"""
    image_base64: str
    folder: str = "chat_images"

@app.post("/api/upload/image", tags=["Upload"])
async def upload_image(
    upload_data: ImageUploadRequest,
    current_user: dict = Depends(get_current_user)
):
    """Upload an image to Cloudinary and return the URL"""
    try:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            f"data:image/jpeg;base64,{upload_data.image_base64}",
            folder=upload_data.folder,
            resource_type="image",
            transformation=[
                {"width": 1200, "height": 1200, "crop": "limit"},  # Max dimensions
                {"quality": "auto:good"},  # Auto quality
                {"fetch_format": "auto"}  # Auto format (webp, etc)
            ]
        )
        
        return {
            "success": True,
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "width": result.get("width"),
            "height": result.get("height"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


# ============== SAFETY & SECURITY ENDPOINTS ==============

@app.post("/api/safety/report", tags=["Safety"])
async def report_user(
    report: ReportUser,
    current_user: dict = Depends(get_current_user)
):
    """Report a user for inappropriate behavior"""
    reporter_id = str(current_user["_id"])
    
    # Can't report yourself
    if report.user_id == reporter_id:
        raise HTTPException(status_code=400, detail="You cannot report yourself")
    
    # Check if reported user exists
    try:
        reported_user = await users_collection.find_one({"_id": ObjectId(report.user_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not reported_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check for duplicate recent report
    existing = await reports_collection.find_one({
        "reporter_id": reporter_id,
        "reported_user_id": report.user_id,
        "created_at": {"$gte": datetime.utcnow() - timedelta(hours=24)}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="You already reported this user recently")
    
    report_doc = {
        "reporter_id": reporter_id,
        "reported_user_id": report.user_id,
        "reason": report.reason.value,
        "details": report.details,
        "status": "pending",  # pending, reviewed, action_taken, dismissed
        "created_at": datetime.utcnow(),
    }
    
    await reports_collection.insert_one(report_doc)
    
    # Increment report count on user
    await users_collection.update_one(
        {"_id": ObjectId(report.user_id)},
        {"$inc": {"report_count": 1}}
    )
    
    return {
        "message": "Report submitted successfully. Thank you for keeping SEE ME safe.",
        "status": "pending"
    }


@app.post("/api/safety/block", tags=["Safety"])
async def block_user(
    block: BlockUser,
    current_user: dict = Depends(get_current_user)
):
    """Block a user - they won't see you and you won't see them"""
    blocker_id = str(current_user["_id"])
    
    if block.user_id == blocker_id:
        raise HTTPException(status_code=400, detail="You cannot block yourself")
    
    # Check if already blocked
    existing = await blocks_collection.find_one({
        "blocker_id": blocker_id,
        "blocked_user_id": block.user_id
    })
    
    if existing:
        return {"message": "User already blocked", "blocked": True}
    
    block_doc = {
        "blocker_id": blocker_id,
        "blocked_user_id": block.user_id,
        "created_at": datetime.utcnow(),
    }
    
    await blocks_collection.insert_one(block_doc)
    
    # Also cancel any pending vibes between them
    await vibes_collection.update_many(
        {
            "$or": [
                {"from_user_id": blocker_id, "to_user_id": block.user_id},
                {"from_user_id": block.user_id, "to_user_id": blocker_id}
            ],
            "status": "pending"
        },
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "User blocked successfully", "blocked": True}


@app.delete("/api/safety/block/{user_id}", tags=["Safety"])
async def unblock_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Unblock a previously blocked user"""
    blocker_id = str(current_user["_id"])
    
    result = await blocks_collection.delete_one({
        "blocker_id": blocker_id,
        "blocked_user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User was not blocked")
    
    return {"message": "User unblocked successfully", "blocked": False}


@app.get("/api/safety/blocked", tags=["Safety"])
async def get_blocked_users(
    current_user: dict = Depends(get_current_user)
):
    """Get list of blocked users"""
    blocker_id = str(current_user["_id"])
    
    cursor = blocks_collection.find({"blocker_id": blocker_id})
    blocks = await cursor.to_list(length=100)
    
    blocked_ids = [b["blocked_user_id"] for b in blocks]
    
    # Get user info
    if not blocked_ids:
        return []
    
    users_cursor = users_collection.find(
        {"_id": {"$in": [ObjectId(uid) for uid in blocked_ids]}},
        {"name": 1, "photo_url": 1}
    )
    users = await users_cursor.to_list(length=100)
    users_map = {str(u["_id"]): u for u in users}
    
    return [
        {
            "user_id": b["blocked_user_id"],
            "name": users_map.get(b["blocked_user_id"], {}).get("name", "Unknown"),
            "photo_url": users_map.get(b["blocked_user_id"], {}).get("photo_url"),
            "blocked_at": b["created_at"]
        }
        for b in blocks
    ]


@app.post("/api/safety/emergency-contact", tags=["Safety"])
async def set_emergency_contact(
    contact: SafetyContact,
    current_user: dict = Depends(get_current_user)
):
    """Set or update emergency contact"""
    user_id = str(current_user["_id"])
    
    contact_doc = {
        "user_id": user_id,
        "name": contact.name,
        "phone": contact.phone,
        "relationship": contact.relationship,
        "updated_at": datetime.utcnow(),
    }
    
    await safety_contacts_collection.update_one(
        {"user_id": user_id},
        {"$set": contact_doc},
        upsert=True
    )
    
    return {
        "message": "Emergency contact saved",
        "contact": {
            "name": contact.name,
            "phone": contact.phone,
            "relationship": contact.relationship
        }
    }


@app.get("/api/safety/emergency-contact", tags=["Safety"])
async def get_emergency_contact(
    current_user: dict = Depends(get_current_user)
):
    """Get current emergency contact"""
    user_id = str(current_user["_id"])
    
    contact = await safety_contacts_collection.find_one({"user_id": user_id})
    
    if not contact:
        return None
    
    return {
        "name": contact["name"],
        "phone": contact["phone"],
        "relationship": contact.get("relationship")
    }


@app.post("/api/safety/share-date", tags=["Safety"])
async def share_date_location(
    share_data: ShareLocation,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate share data for sending to a trusted contact.
    Returns formatted message to share via SMS/WhatsApp.
    """
    user_id = str(current_user["_id"])
    user_name = current_user.get("name", "A SEE ME user")
    
    # Get current check-in if any
    checkin = await checkins_collection.find_one({
        "user_id": user_id,
        "is_active": True
    })
    
    location_info = share_data.place_name
    if checkin:
        location_info = checkin.get("place_name", share_data.place_name)
    
    # Generate shareable message
    now = datetime.utcnow()
    expected_end = now + timedelta(hours=share_data.duration_hours)
    
    share_message = f"""🛡️ SEE ME Safety Check

{user_name} is meeting someone at:
📍 {location_info}

Started: {now.strftime('%I:%M %p')}
Expected duration: {share_data.duration_hours} hours

{f"Notes: {share_data.notes}" if share_data.notes else ""}

If you don't hear from them by {expected_end.strftime('%I:%M %p')}, please check in.

- Sent via SEE ME App"""
    
    return {
        "message": share_message,
        "recipient": {
            "name": share_data.contact_name,
            "phone": share_data.contact_phone
        },
        "expires_at": expected_end.isoformat()
    }


@app.post("/api/safety/verify-photo", tags=["Safety"])
async def submit_photo_verification(
    verification: PhotoVerification,
    current_user: dict = Depends(get_current_user)
):
    """
    Submit a selfie for profile verification.
    For MVP: Just stores the photo, manual review later.
    """
    user_id = str(current_user["_id"])
    
    # Check if already verified
    if current_user.get("is_verified"):
        return {"message": "Profile already verified", "status": "verified"}
    
    # Check for pending verification
    existing = await verifications_collection.find_one({
        "user_id": user_id,
        "status": "pending"
    })
    
    if existing:
        return {
            "message": "Verification already pending",
            "status": "pending",
            "submitted_at": existing["created_at"]
        }
    
    verification_doc = {
        "user_id": user_id,
        "selfie_base64": verification.selfie_base64[:100] + "...",  # Don't store full base64 in this demo
        "status": "pending",  # pending, approved, rejected
        "created_at": datetime.utcnow(),
    }
    
    await verifications_collection.insert_one(verification_doc)
    
    # For demo purposes, auto-approve after 5 seconds (in real app would be manual review)
    # In production, this would go to a moderation queue
    
    return {
        "message": "Verification photo submitted. You'll be notified once reviewed.",
        "status": "pending"
    }


@app.get("/api/safety/verification-status", tags=["Safety"])
async def get_verification_status(
    current_user: dict = Depends(get_current_user)
):
    """Get current verification status"""
    user_id = str(current_user["_id"])
    
    if current_user.get("is_verified"):
        return {"status": "verified", "verified_at": current_user.get("verified_at")}
    
    verification = await verifications_collection.find_one(
        {"user_id": user_id},
        sort=[("created_at", -1)]
    )
    
    if not verification:
        return {"status": "not_submitted"}
    
    return {
        "status": verification["status"],
        "submitted_at": verification["created_at"]
    }


# Helper function to check if user is blocked
async def is_user_blocked(user_id: str, other_user_id: str) -> bool:
    """Check if either user has blocked the other"""
    block = await blocks_collection.find_one({
        "$or": [
            {"blocker_id": user_id, "blocked_user_id": other_user_id},
            {"blocker_id": other_user_id, "blocked_user_id": user_id}
        ]
    })
    return block is not None


# ============== PRESENCE & STATUS ENDPOINTS ==============

@app.get("/api/presence/status-messages", tags=["Presence"])
async def get_suggested_status_messages():
    """Get list of suggested status messages"""
    return SUGGESTED_STATUS_MESSAGES


@app.put("/api/presence/status", tags=["Presence"])
async def update_status_message(
    status: UpdateStatusMessage,
    current_user: dict = Depends(get_current_user)
):
    """Update user's status message (On my way, etc.)"""
    user_id = str(current_user["_id"])
    
    message = status.message
    if status.suggested_id:
        # Find the suggested message
        for msg in SUGGESTED_STATUS_MESSAGES:
            if msg["id"] == status.suggested_id:
                message = msg["textEs"]  # Use Spanish version
                break
    
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "status_message": message,
            "status_updated_at": datetime.utcnow()
        }}
    )
    
    return {
        "message": "Status updated",
        "status_message": message
    }


@app.delete("/api/presence/status", tags=["Presence"])
async def clear_status_message(
    current_user: dict = Depends(get_current_user)
):
    """Clear user's status message"""
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"status_message": None}}
    )
    return {"message": "Status cleared"}


@app.put("/api/presence/ghost-mode", tags=["Presence"])
async def toggle_ghost_mode(
    ghost: UpdateGhostMode,
    current_user: dict = Depends(get_current_user)
):
    """Toggle ghost mode (Premium only)"""
    if not current_user.get("is_premium", False):
        raise HTTPException(
            status_code=403,
            detail="Ghost mode is a Premium feature. Upgrade to enable it."
        )
    
    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"ghost_mode": ghost.enabled}}
    )
    
    return {
        "message": f"Ghost mode {'enabled' if ghost.enabled else 'disabled'}",
        "ghost_mode": ghost.enabled
    }


@app.post("/api/presence/update", tags=["Presence"])
async def update_presence(
    presence: PresenceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update user's presence based on GPS location.
    Checks if user is still within the check-in radius.
    If not, auto-checkout happens.
    """
    user_id = str(current_user["_id"])
    now = datetime.utcnow()
    
    # Get current active check-in
    active_checkin = await checkins_collection.find_one({
        "user_id": user_id,
        "is_active": True
    })
    
    if not active_checkin:
        # No active check-in, user is not present anywhere
        await users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$set": {
                "is_present": False,
                "current_place_id": None,
                "current_place_name": None,
                "last_location_update": now
            }}
        )
        return {
            "is_present": False,
            "checked_out": False,
            "message": "No active check-in"
        }
    
    # Get the place location
    place = await places_collection.find_one({"_id": ObjectId(active_checkin["place_id"])})
    if not place:
        return {"is_present": False, "message": "Place not found"}
    
    # Calculate distance from place
    distance = calculate_distance_meters(
        presence.latitude, presence.longitude,
        place["latitude"], place["longitude"]
    )
    
    # Check if still within radius
    is_within_radius = distance <= CHECKIN_RADIUS_METERS
    
    if is_within_radius:
        # User is still at the place - update presence
        await users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$set": {
                "is_present": True,
                "current_place_id": str(place["_id"]),
                "current_place_name": place["name"],
                "last_location_update": now
            }}
        )
        return {
            "is_present": True,
            "checked_out": False,
            "place_name": place["name"],
            "distance": round(distance, 1)
        }
    else:
        # User has left the place - auto-checkout
        await checkins_collection.update_one(
            {"_id": active_checkin["_id"]},
            {"$set": {
                "is_active": False,
                "checked_out_at": now,
                "auto_checkout": True,
                "checkout_reason": "left_radius"
            }}
        )
        
        await users_collection.update_one(
            {"_id": current_user["_id"]},
            {"$set": {
                "is_present": False,
                "current_place_id": None,
                "current_place_name": None,
                "last_location_update": now
            }}
        )
        
        return {
            "is_present": False,
            "checked_out": True,
            "message": f"Auto-checkout: You left {place['name']}",
            "distance": round(distance, 1)
        }


@app.get("/api/presence/me", tags=["Presence"])
async def get_my_presence(
    current_user: dict = Depends(get_current_user)
):
    """Get current user's presence status"""
    user_id = str(current_user["_id"])
    
    # Get active check-in
    active_checkin = await checkins_collection.find_one({
        "user_id": user_id,
        "is_active": True
    })
    
    return {
        "is_present": current_user.get("is_present", False),
        "status_message": current_user.get("status_message"),
        "ghost_mode": current_user.get("ghost_mode", False),
        "current_place_id": current_user.get("current_place_id"),
        "current_place_name": current_user.get("current_place_name"),
        "has_active_checkin": active_checkin is not None,
        "checkin_place": active_checkin.get("place_name") if active_checkin else None,
        "is_premium": current_user.get("is_premium", False)
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
        "version": "2.2.0",
        "timestamp": datetime.utcnow().isoformat(),
        "features": {
            "real_activity": True,
            "anti_spam": True,
            "auto_cleanup": True,
            "qr_checkin": True,
            "business_partners": True,
            "invitations": True,
        }
    }


# ============== INVITATIONS SYSTEM ("Quién para...") ==============

class PaymentType(str, Enum):
    FULL = "full"  # I'll pay for everything
    HALF = "half"  # Split the bill

class CreateInvitation(BaseModel):
    """Create a new invitation"""
    text: str = Field(..., min_length=5, max_length=200, description="What's the plan? e.g., 'Quién mañana para el cine?'")
    payment_type: PaymentType = Field(..., description="full = I pay, half = we split")
    event_date: str = Field(..., description="Date of the event (YYYY-MM-DD)")
    event_time: Optional[str] = Field(None, description="Time of the event (HH:MM)")
    place_name: Optional[str] = Field(None, max_length=100, description="Where?")
    place_address: Optional[str] = Field(None, max_length=200)
    target_user_id: Optional[str] = Field(None, description="Premium only: send to specific user")

class InvitationResponse(BaseModel):
    """Invitation response model - Basic view (photo + message only for basic users)"""
    id: str
    user_id: str
    user_name: str
    user_photo: Optional[str]
    # These fields are only populated for Premium users or if accepted
    user_vibes_received: Optional[int] = None
    user_rating: Optional[float] = None
    text: str
    payment_type: str
    event_date: str
    event_time: Optional[str]
    place_name: Optional[str]
    place_address: Optional[str]
    created_at: datetime
    expires_at: datetime
    responses_count: int
    is_targeted: bool  # True if sent to specific person (Premium)
    can_see_profile: bool = False  # True if user can see creator's full profile

class InvitationDetailResponse(InvitationResponse):
    """Detailed invitation with creator profile - Premium users or accepted only"""
    user_reviews_count: Optional[int] = None
    user_places_visited: Optional[int] = None
    user_is_verified: Optional[bool] = None
    has_responded: bool  # If current user already responded
    is_accepted: bool = False  # If creator accepted the response

class RateUser(BaseModel):
    """Rate a user after meeting (5-star system like Uber)"""
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    comment: Optional[str] = Field(None, max_length=500)

class RespondToInvitation(BaseModel):
    """Respond to an invitation"""
    message: Optional[str] = Field(None, max_length=200, description="Optional message with response")


@app.post("/api/invitations", response_model=InvitationResponse, tags=["Invitations"])
async def create_invitation(
    invitation: CreateInvitation,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new invitation ("Quién para...").
    - Basic users: Public invitation visible to all
    - Premium users: Can also send to specific users
    """
    user_id = str(current_user["_id"])
    
    # Check if targeting specific user (Premium only)
    is_targeted = False
    if invitation.target_user_id:
        if not current_user.get("is_premium", False):
            raise HTTPException(
                status_code=403,
                detail="Sending invitations to specific users is a Premium feature"
            )
        # Verify target user exists
        if not ObjectId.is_valid(invitation.target_user_id):
            raise HTTPException(status_code=400, detail="Invalid target user ID")
        target_user = await users_collection.find_one({"_id": ObjectId(invitation.target_user_id)})
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")
        is_targeted = True
    
    # Parse event date for expiration
    try:
        event_date = datetime.strptime(invitation.event_date, "%Y-%m-%d")
        # Invitation expires at end of event day
        expires_at = event_date.replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Check if event is in the past
    if expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Event date cannot be in the past")
    
    # Count vibes received by this user
    vibes_received = await vibes_collection.count_documents({"to_user_id": user_id})
    
    # Get user's average rating
    ratings = await reviews_collection.find({"user_id": user_id}).to_list(length=100)
    avg_rating = sum(r.get("rating", 0) for r in ratings) / len(ratings) if ratings else None
    
    # Create invitation document
    invitation_doc = {
        "user_id": user_id,
        "text": invitation.text,
        "payment_type": invitation.payment_type.value,
        "event_date": invitation.event_date,
        "event_time": invitation.event_time,
        "place_name": invitation.place_name,
        "place_address": invitation.place_address,
        "target_user_id": invitation.target_user_id,
        "is_targeted": is_targeted,
        "created_at": datetime.utcnow(),
        "expires_at": expires_at,
        "responses": [],  # List of user IDs who responded
    }
    
    result = await invitations_collection.insert_one(invitation_doc)
    
    return InvitationResponse(
        id=str(result.inserted_id),
        user_id=user_id,
        user_name=current_user.get("name", "Anonymous"),
        user_photo=current_user.get("photo_url"),
        user_vibes_received=vibes_received,
        user_rating=avg_rating,
        text=invitation.text,
        payment_type=invitation.payment_type.value,
        event_date=invitation.event_date,
        event_time=invitation.event_time,
        place_name=invitation.place_name,
        place_address=invitation.place_address,
        created_at=invitation_doc["created_at"],
        expires_at=expires_at,
        responses_count=0,
        is_targeted=is_targeted,
    )


@app.get("/api/invitations", response_model=List[InvitationResponse], tags=["Invitations"])
async def get_invitations(
    payment_type: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """
    Get active invitations (like WhatsApp broadcast).
    - Basic users: See only photo + message (no profile details)
    - Premium users: See full profile info (vibes, rating, etc.)
    """
    user_id = str(current_user["_id"])
    is_premium = current_user.get("is_premium", False)
    now = datetime.utcnow()
    
    # Build query: public invitations OR targeted to me, not expired
    query = {
        "expires_at": {"$gt": now},
        "$or": [
            {"is_targeted": False},  # Public invitations
            {"target_user_id": user_id},  # Targeted to me
        ]
    }
    
    if payment_type and payment_type in ["full", "half"]:
        query["payment_type"] = payment_type
    
    cursor = invitations_collection.find(query).sort("created_at", -1).limit(limit)
    invitations = await cursor.to_list(length=limit)
    
    result = []
    for inv in invitations:
        # Get invitation creator info
        creator = await users_collection.find_one({"_id": ObjectId(inv["user_id"])})
        if not creator:
            continue
        
        # Check if this user has been accepted by the creator
        accepted_responses = inv.get("accepted_responses", [])
        is_accepted = user_id in accepted_responses
        
        # Premium users OR accepted users can see full profile
        can_see_profile = is_premium or is_accepted
        
        # Only fetch full profile data if user can see it
        vibes_received = None
        avg_rating = None
        if can_see_profile:
            vibes_received = await vibes_collection.count_documents({"to_user_id": inv["user_id"]})
            ratings = await reviews_collection.find({"user_id": inv["user_id"]}).to_list(length=100)
            avg_rating = sum(r.get("rating", 0) for r in ratings) / len(ratings) if ratings else None
        
        result.append(InvitationResponse(
            id=str(inv["_id"]),
            user_id=inv["user_id"],
            user_name=creator.get("name", "Anonymous"),
            user_photo=creator.get("photo_url"),
            user_vibes_received=vibes_received,
            user_rating=avg_rating,
            text=inv["text"],
            payment_type=inv["payment_type"],
            event_date=inv["event_date"],
            event_time=inv.get("event_time"),
            place_name=inv.get("place_name"),
            place_address=inv.get("place_address"),
            created_at=inv["created_at"],
            expires_at=inv["expires_at"],
            responses_count=len(inv.get("responses", [])),
            is_targeted=inv.get("is_targeted", False),
            can_see_profile=can_see_profile,
        ))
    
    return result


@app.get("/api/invitations/{invitation_id}", response_model=InvitationDetailResponse, tags=["Invitations"])
async def get_invitation_detail(
    invitation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed invitation with creator's profile.
    - Basic users: Only see photo + message until accepted
    - Premium users: See full profile (vibes, rating, places, reviews)
    """
    if not ObjectId.is_valid(invitation_id):
        raise HTTPException(status_code=400, detail="Invalid invitation ID")
    
    invitation = await invitations_collection.find_one({"_id": ObjectId(invitation_id)})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    # Get creator info
    creator = await users_collection.find_one({"_id": ObjectId(invitation["user_id"])})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    user_id = str(current_user["_id"])
    is_premium = current_user.get("is_premium", False)
    
    # Check if current user has been accepted
    accepted_responses = invitation.get("accepted_responses", [])
    is_accepted = user_id in accepted_responses
    
    # Premium OR accepted users can see full profile
    can_see_profile = is_premium or is_accepted
    
    # Check if current user already responded
    has_responded = user_id in invitation.get("responses", [])
    
    # Only fetch profile data if user can see it
    vibes_received = None
    avg_rating = None
    reviews_count = None
    places_visited_count = None
    user_is_verified = None
    
    if can_see_profile:
        vibes_received = await vibes_collection.count_documents({"to_user_id": invitation["user_id"]})
        ratings = await reviews_collection.find({"user_id": invitation["user_id"]}).to_list(length=100)
        avg_rating = sum(r.get("rating", 0) for r in ratings) / len(ratings) if ratings else None
        reviews_count = len(ratings)
        places_visited = await checkins_collection.distinct("place_id", {"user_id": invitation["user_id"]})
        places_visited_count = len(places_visited)
        user_is_verified = creator.get("is_verified", False)
    
    return InvitationDetailResponse(
        id=str(invitation["_id"]),
        user_id=invitation["user_id"],
        user_name=creator.get("name", "Anonymous"),
        user_photo=creator.get("photo_url"),
        user_vibes_received=vibes_received,
        user_rating=avg_rating,
        text=invitation["text"],
        payment_type=invitation["payment_type"],
        event_date=invitation["event_date"],
        event_time=invitation.get("event_time"),
        place_name=invitation.get("place_name"),
        place_address=invitation.get("place_address"),
        created_at=invitation["created_at"],
        expires_at=invitation["expires_at"],
        responses_count=len(invitation.get("responses", [])),
        is_targeted=invitation.get("is_targeted", False),
        can_see_profile=can_see_profile,
        user_reviews_count=reviews_count,
        user_places_visited=places_visited_count,
        user_is_verified=user_is_verified,
        has_responded=has_responded,
        is_accepted=is_accepted,
    )


@app.post("/api/invitations/{invitation_id}/respond", tags=["Invitations"])
async def respond_to_invitation(
    invitation_id: str,
    response: RespondToInvitation,
    current_user: dict = Depends(get_current_user)
):
    """
    Respond to an invitation ("Me interesa").
    This sends a Vibe to the invitation creator.
    """
    if not ObjectId.is_valid(invitation_id):
        raise HTTPException(status_code=400, detail="Invalid invitation ID")
    
    invitation = await invitations_collection.find_one({"_id": ObjectId(invitation_id)})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    # Check if expired
    if invitation["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This invitation has expired")
    
    user_id = str(current_user["_id"])
    
    # Can't respond to own invitation
    if invitation["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="You cannot respond to your own invitation")
    
    # Check if already responded
    if user_id in invitation.get("responses", []):
        raise HTTPException(status_code=400, detail="You have already responded to this invitation")
    
    # Add response
    await invitations_collection.update_one(
        {"_id": ObjectId(invitation_id)},
        {"$push": {"responses": user_id}}
    )
    
    # Send a Vibe to the invitation creator
    vibe_message = response.message or f"Me interesa tu plan: {invitation['text'][:50]}..."
    
    vibe_doc = {
        "from_user_id": user_id,
        "to_user_id": invitation["user_id"],
        "message": vibe_message,
        "vibe_type": "invitation_response",
        "invitation_id": invitation_id,
        "status": "pending",
        "created_at": datetime.utcnow(),
    }
    
    await vibes_collection.insert_one(vibe_doc)
    
    return {
        "message": "Response sent! The creator will see your interest.",
        "vibe_sent": True
    }


@app.get("/api/invitations/my/created", response_model=List[InvitationResponse], tags=["Invitations"])
async def get_my_invitations(
    current_user: dict = Depends(get_current_user)
):
    """Get invitations I created"""
    user_id = str(current_user["_id"])
    
    cursor = invitations_collection.find({"user_id": user_id}).sort("created_at", -1)
    invitations = await cursor.to_list(length=100)
    
    # Count vibes received
    vibes_received = await vibes_collection.count_documents({"to_user_id": user_id})
    
    # Get average rating
    ratings = await reviews_collection.find({"user_id": user_id}).to_list(length=100)
    avg_rating = sum(r.get("rating", 0) for r in ratings) / len(ratings) if ratings else None
    
    result = []
    for inv in invitations:
        result.append(InvitationResponse(
            id=str(inv["_id"]),
            user_id=user_id,
            user_name=current_user.get("name", "Anonymous"),
            user_photo=current_user.get("photo_url"),
            user_vibes_received=vibes_received,
            user_rating=avg_rating,
            text=inv["text"],
            payment_type=inv["payment_type"],
            event_date=inv["event_date"],
            event_time=inv.get("event_time"),
            place_name=inv.get("place_name"),
            place_address=inv.get("place_address"),
            created_at=inv["created_at"],
            expires_at=inv["expires_at"],
            responses_count=len(inv.get("responses", [])),
            is_targeted=inv.get("is_targeted", False),
        ))
    
    return result


@app.delete("/api/invitations/{invitation_id}", tags=["Invitations"])
async def delete_invitation(
    invitation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete my invitation"""
    if not ObjectId.is_valid(invitation_id):
        raise HTTPException(status_code=400, detail="Invalid invitation ID")
    
    invitation = await invitations_collection.find_one({"_id": ObjectId(invitation_id)})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invitation["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only delete your own invitations")
    
    await invitations_collection.delete_one({"_id": ObjectId(invitation_id)})
    
    return {"message": "Invitation deleted"}


@app.get("/api/invitations/{invitation_id}/responses", tags=["Invitations"])
async def get_invitation_responses(
    invitation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get list of users who responded to my invitation"""
    if not ObjectId.is_valid(invitation_id):
        raise HTTPException(status_code=400, detail="Invalid invitation ID")
    
    invitation = await invitations_collection.find_one({"_id": ObjectId(invitation_id)})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invitation["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only view responses to your own invitations")
    
    # Get responders info
    responders = []
    for resp_id in invitation.get("responses", []):
        user = await users_collection.find_one({"_id": ObjectId(resp_id)})
        if user:
            vibes_received = await vibes_collection.count_documents({"to_user_id": resp_id})
            ratings = await reviews_collection.find({"user_id": resp_id}).to_list(length=100)
            avg_rating = sum(r.get("rating", 0) for r in ratings) / len(ratings) if ratings else None
            
            responders.append({
                "user_id": resp_id,
                "name": user.get("name", "Anonymous"),
                "photo_url": user.get("photo_url"),
                "vibes_received": vibes_received,
                "rating": avg_rating,
                "is_verified": user.get("is_verified", False),
            })
    
    return {
        "invitation_id": invitation_id,
        "responses_count": len(responders),
        "responders": responders
    }


@app.get("/api/users/search", tags=["Invitations"])
async def search_users_for_invitation(
    query: str,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Premium only: Search users to send targeted invitation.
    """
    if not current_user.get("is_premium", False):
        raise HTTPException(
            status_code=403,
            detail="Searching users is a Premium feature"
        )
    
    user_id = str(current_user["_id"])
    
    # Search by name (case insensitive)
    cursor = users_collection.find({
        "_id": {"$ne": current_user["_id"]},  # Exclude self
        "name": {"$regex": query, "$options": "i"},
        "ghost_mode": {"$ne": True},  # Respect ghost mode
    }).limit(limit)
    
    users = await cursor.to_list(length=limit)
    
    result = []
    for user in users:
        uid = str(user["_id"])
        vibes_received = await vibes_collection.count_documents({"to_user_id": uid})
        
        result.append({
            "user_id": uid,
            "name": user.get("name", "Anonymous"),
            "photo_url": user.get("photo_url"),
            "vibes_received": vibes_received,
            "is_verified": user.get("is_verified", False),
        })
    
    return result


@app.post("/api/invitations/{invitation_id}/accept/{user_id}", tags=["Invitations"])
async def accept_invitation_response(
    invitation_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Accept a user's response to your invitation.
    This allows the basic user to see your full profile.
    """
    if not ObjectId.is_valid(invitation_id):
        raise HTTPException(status_code=400, detail="Invalid invitation ID")
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    invitation = await invitations_collection.find_one({"_id": ObjectId(invitation_id)})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    # Only the creator can accept responses
    if invitation["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only the invitation creator can accept responses")
    
    # Check if user has responded
    if user_id not in invitation.get("responses", []):
        raise HTTPException(status_code=400, detail="This user hasn't responded to your invitation")
    
    # Add to accepted_responses
    await invitations_collection.update_one(
        {"_id": ObjectId(invitation_id)},
        {"$addToSet": {"accepted_responses": user_id}}
    )
    
    # Create a chat between the two users (24h temporary chat)
    chat_doc = {
        "participants": [invitation["user_id"], user_id],
        "invitation_id": invitation_id,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(hours=24),
        "is_active": True,
    }
    chat_result = await chats_collection.insert_one(chat_doc)
    
    return {
        "message": "Response accepted! You can now chat.",
        "chat_id": str(chat_result.inserted_id)
    }


@app.post("/api/invitations/{invitation_id}/reject/{user_id}", tags=["Invitations"])
async def reject_invitation_response(
    invitation_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Reject a user's response to your invitation."""
    if not ObjectId.is_valid(invitation_id):
        raise HTTPException(status_code=400, detail="Invalid invitation ID")
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    invitation = await invitations_collection.find_one({"_id": ObjectId(invitation_id)})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invitation["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Only the invitation creator can reject responses")
    
    # Remove from responses
    await invitations_collection.update_one(
        {"_id": ObjectId(invitation_id)},
        {"$pull": {"responses": user_id}}
    )
    
    return {"message": "Response rejected"}


@app.post("/api/users/{user_id}/rate", tags=["Reviews"])
async def rate_user(
    user_id: str,
    rating: RateUser,
    current_user: dict = Depends(get_current_user)
):
    """
    Rate a user (5-star system like Uber).
    Can only rate users you've interacted with (accepted invitation).
    """
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    rater_id = str(current_user["_id"])
    
    if rater_id == user_id:
        raise HTTPException(status_code=400, detail="You cannot rate yourself")
    
    # Check if target user exists
    target_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if they've had an accepted interaction (via invitation)
    interaction = await invitations_collection.find_one({
        "$or": [
            {"user_id": rater_id, "accepted_responses": user_id},
            {"user_id": user_id, "accepted_responses": rater_id},
        ]
    })
    
    if not interaction:
        raise HTTPException(
            status_code=403,
            detail="You can only rate users you've had an accepted interaction with"
        )
    
    # Check if already rated this user
    existing_rating = await reviews_collection.find_one({
        "reviewer_id": rater_id,
        "user_id": user_id
    })
    
    if existing_rating:
        # Update existing rating
        await reviews_collection.update_one(
            {"_id": existing_rating["_id"]},
            {"$set": {
                "rating": rating.rating,
                "comment": rating.comment,
                "updated_at": datetime.utcnow()
            }}
        )
        return {"message": "Rating updated", "rating": rating.rating}
    
    # Create new rating
    review_doc = {
        "reviewer_id": rater_id,
        "user_id": user_id,
        "rating": rating.rating,
        "comment": rating.comment,
        "created_at": datetime.utcnow()
    }
    await reviews_collection.insert_one(review_doc)
    
    return {"message": "Rating submitted", "rating": rating.rating}


@app.get("/api/users/{user_id}/reviews", tags=["Reviews"])
async def get_user_reviews(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get reviews for a user.
    Premium users can see reviews of anyone.
    Basic users can only see reviews if they've been accepted.
    """
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    viewer_id = str(current_user["_id"])
    is_premium = current_user.get("is_premium", False)
    
    # Check if viewer can see this user's reviews
    if not is_premium and viewer_id != user_id:
        # Check if they've had an accepted interaction
        interaction = await invitations_collection.find_one({
            "$or": [
                {"user_id": viewer_id, "accepted_responses": user_id},
                {"user_id": user_id, "accepted_responses": viewer_id},
            ]
        })
        if not interaction:
            raise HTTPException(
                status_code=403,
                detail="Upgrade to Premium to view user reviews"
            )
    
    # Get reviews
    cursor = reviews_collection.find({"user_id": user_id}).sort("created_at", -1)
    reviews = await cursor.to_list(length=50)
    
    # Get average rating
    avg_rating = sum(r.get("rating", 0) for r in reviews) / len(reviews) if reviews else None
    
    result = []
    for review in reviews:
        # Get reviewer info
        reviewer = await users_collection.find_one({"_id": ObjectId(review["reviewer_id"])})
        result.append({
            "id": str(review["_id"]),
            "rating": review["rating"],
            "comment": review.get("comment"),
            "reviewer_name": reviewer.get("name", "Anonymous") if reviewer else "Anonymous",
            "reviewer_photo": reviewer.get("photo_url") if reviewer else None,
            "created_at": review["created_at"].isoformat()
        })
    
    return {
        "user_id": user_id,
        "average_rating": avg_rating,
        "total_reviews": len(reviews),
        "reviews": result
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
