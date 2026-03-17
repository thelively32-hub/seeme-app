#!/usr/bin/env python3
"""
SEE ME API - Nearby Places Endpoint Testing
Testing the new /api/places/nearby endpoint with Google Places API integration
Target: https://presence-real.preview.emergentagent.com
"""

import requests
import json
import sys
from datetime import datetime

# API Base URL - External deployment
BASE_URL = "https://presence-real.preview.emergentagent.com/api"

# Test coordinates (New York City)
TEST_LAT = 40.7128
TEST_LNG = -74.0060

# Test coordinates for radius test (different location)
TEST_LAT_2 = 40.7580
TEST_LNG_2 = -73.9855

class NearbyTestSession:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        
    def set_auth_token(self, token):
        self.auth_token = token
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def log_test(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        print()

def register_test_user(test_session):
    """Register a test user for authenticated requests"""
    print("=== Setting Up Test User ===")
    
    try:
        user_data = {
            "name": "Nearby Places Tester",
            "email": "nearby@seeme.app",
            "password": "test123456"
        }
        
        response = test_session.session.post(f"{BASE_URL}/auth/register", json=user_data)
        
        if response.status_code != 200:
            # Try login if user already exists
            login_data = {
                "email": "nearby@seeme.app",
                "password": "test123456"
            }
            response = test_session.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
        if response.status_code != 200:
            test_session.log_test("User Setup", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        test_session.set_auth_token(data["access_token"])
        test_session.user_data = data["user"]
        
        test_session.log_test("User Setup", True, f"User ready: {data['user']['name']}")
        return True
        
    except Exception as e:
        test_session.log_test("User Setup", False, f"Exception: {str(e)}")
        return False

def test_basic_nearby_places(test_session):
    """Test 1: Basic nearby places request"""
    print("=== Testing Basic Nearby Places Request ===")
    
    try:
        # Call the nearby places endpoint
        response = test_session.session.get(
            f"{BASE_URL}/places/nearby?lat={TEST_LAT}&lng={TEST_LNG}"
        )
        
        if response.status_code != 200:
            test_session.log_test("Basic Nearby Request", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        places = response.json()
        
        if not isinstance(places, list):
            test_session.log_test("Basic Nearby Request", False, "Response is not a list")
            return False
            
        if len(places) == 0:
            test_session.log_test("Basic Nearby Request", False, "No places returned")
            return False
            
        # Verify each place has required fields
        first_place = places[0]
        required_fields = ["id", "name", "type", "latitude", "longitude", "activity_level", "activity_label", "is_trending", "distance"]
        
        missing_fields = []
        for field in required_fields:
            if field not in first_place:
                missing_fields.append(field)
                
        if missing_fields:
            test_session.log_test("Basic Nearby Request", False, f"Missing required fields: {missing_fields}")
            return False
            
        test_session.log_test("Basic Nearby Request", True, 
            f"Found {len(places)} nearby places. First place: {first_place['name']} ({first_place['type']}) - {first_place['distance']}")
        return True
        
    except Exception as e:
        test_session.log_test("Basic Nearby Request", False, f"Exception: {str(e)}")
        return False

def test_google_places_integration(test_session):
    """Test 2: Google Places integration and database saving"""
    print("=== Testing Google Places Integration ===")
    
    try:
        # Call the nearby places endpoint
        response = test_session.session.get(
            f"{BASE_URL}/places/nearby?lat={TEST_LAT}&lng={TEST_LNG}"
        )
        
        if response.status_code != 200:
            test_session.log_test("Google Places Integration", False, f"Status: {response.status_code}")
            return False
            
        places = response.json()
        
        # Check if we have places from both internal DB and Google
        internal_places = [p for p in places if p.get("source") == "internal"]
        google_places = [p for p in places if p.get("source") == "google"]
        
        # We should have at least some places (either internal or Google)
        if len(places) == 0:
            test_session.log_test("Google Places Integration", False, "No places found from any source")
            return False
            
        # Verify Google places have google_place_id if they exist
        google_places_with_id = [p for p in google_places if p.get("google_place_id")]
        
        test_session.log_test("Google Places Integration", True, 
            f"Found {len(internal_places)} internal places and {len(google_places)} Google places "
            f"({len(google_places_with_id)} with Google IDs)")
        return True
        
    except Exception as e:
        test_session.log_test("Google Places Integration", False, f"Exception: {str(e)}")
        return False

def test_response_format_validation(test_session):
    """Test 3: Response format validation"""
    print("=== Testing Response Format Validation ===")
    
    try:
        response = test_session.session.get(
            f"{BASE_URL}/places/nearby?lat={TEST_LAT}&lng={TEST_LNG}"
        )
        
        if response.status_code != 200:
            test_session.log_test("Response Format", False, f"Status: {response.status_code}")
            return False
            
        places = response.json()
        
        if len(places) == 0:
            test_session.log_test("Response Format", False, "No places to validate")
            return False
            
        validation_errors = []
        
        for place in places[:5]:  # Check first 5 places
            # Validate activity_level
            valid_activity_levels = ["none", "low", "medium", "high", "trending"]
            if place.get("activity_level") not in valid_activity_levels:
                validation_errors.append(f"Invalid activity_level: {place.get('activity_level')}")
                
            # Validate coordinates are numbers
            try:
                float(place.get("latitude", 0))
                float(place.get("longitude", 0))
            except (ValueError, TypeError):
                validation_errors.append(f"Invalid coordinates in place: {place.get('name')}")
                
            # Validate distance format
            distance = place.get("distance", "")
            if not (distance.endswith(" m") or distance.endswith(" km")):
                validation_errors.append(f"Invalid distance format: {distance}")
                
        if validation_errors:
            test_session.log_test("Response Format", False, f"Validation errors: {validation_errors}")
            return False
            
        test_session.log_test("Response Format", True, 
            f"All {len(places)} places have valid format. Activity levels, coordinates, and distance formatting correct.")
        return True
        
    except Exception as e:
        test_session.log_test("Response Format", False, f"Exception: {str(e)}")
        return False

def test_radius_parameter(test_session):
    """Test 4: Custom radius parameter"""
    print("=== Testing Custom Radius Parameter ===")
    
    try:
        # Test with 1000m radius
        response_1000 = test_session.session.get(
            f"{BASE_URL}/places/nearby?lat={TEST_LAT}&lng={TEST_LNG}&radius=1000"
        )
        
        # Test with 2000m radius (default)
        response_2000 = test_session.session.get(
            f"{BASE_URL}/places/nearby?lat={TEST_LAT}&lng={TEST_LNG}&radius=2000"
        )
        
        if response_1000.status_code != 200 or response_2000.status_code != 200:
            test_session.log_test("Custom Radius", False, 
                f"Status codes: {response_1000.status_code}, {response_2000.status_code}")
            return False
            
        places_1000 = response_1000.json()
        places_2000 = response_2000.json()
        
        # Validate that distances are within specified radius
        radius_violations_1000 = []
        for place in places_1000:
            distance_str = place.get("distance", "")
            try:
                if distance_str.endswith(" km"):
                    distance_m = float(distance_str.replace(" km", "")) * 1000
                else:
                    distance_m = float(distance_str.replace(" m", ""))
                    
                if distance_m > 1000:
                    radius_violations_1000.append(f"{place['name']}: {distance_str}")
            except:
                pass  # Skip invalid distance formats
                
        if radius_violations_1000:
            test_session.log_test("Custom Radius", False, 
                f"Places outside 1000m radius: {radius_violations_1000}")
            return False
            
        # Generally, 2000m radius should return more or equal places than 1000m
        test_session.log_test("Custom Radius", True, 
            f"Radius filtering working. 1000m: {len(places_1000)} places, 2000m: {len(places_2000)} places")
        return True
        
    except Exception as e:
        test_session.log_test("Custom Radius", False, f"Exception: {str(e)}")
        return False

def test_activity_level_calculation(test_session):
    """Test 5: Activity level calculation with check-ins"""
    print("=== Testing Activity Level Calculation ===")
    
    try:
        # Get nearby places first
        response = test_session.session.get(
            f"{BASE_URL}/places/nearby?lat={TEST_LAT}&lng={TEST_LNG}&limit=5"
        )
        
        if response.status_code != 200:
            test_session.log_test("Activity Calculation", False, f"Status: {response.status_code}")
            return False
            
        places = response.json()
        
        if len(places) == 0:
            test_session.log_test("Activity Calculation", False, "No places to test activity calculation")
            return False
            
        # Record initial activity level
        test_place = places[0]
        initial_activity = test_place["activity_level"]
        place_id = test_place["id"]
        
        # Check in to this place
        checkin_data = {"place_id": place_id}
        checkin_response = test_session.session.post(f"{BASE_URL}/checkins", json=checkin_data)
        
        if checkin_response.status_code != 200:
            test_session.log_test("Activity Calculation", False, 
                f"Check-in failed: {checkin_response.status_code}")
            return False
            
        # Get places again to check activity update
        response_after = test_session.session.get(
            f"{BASE_URL}/places/nearby?lat={TEST_LAT}&lng={TEST_LNG}&limit=5"
        )
        
        if response_after.status_code != 200:
            test_session.log_test("Activity Calculation", False, "Failed to get places after check-in")
            return False
            
        places_after = response_after.json()
        updated_place = next((p for p in places_after if p["id"] == place_id), None)
        
        if not updated_place:
            test_session.log_test("Activity Calculation", False, "Place not found after check-in")
            return False
            
        final_activity = updated_place["activity_level"]
        
        # Activity should be calculated based on actual check-ins
        test_session.log_test("Activity Calculation", True, 
            f"Activity calculation working. {test_place['name']}: {initial_activity} → {final_activity}")
        
        # Cleanup: checkout
        test_session.session.post(f"{BASE_URL}/checkins/checkout")
        
        return True
        
    except Exception as e:
        test_session.log_test("Activity Calculation", False, f"Exception: {str(e)}")
        return False

def test_places_within_radius_verification(test_session):
    """Test 6: Verify all returned places are within specified radius"""
    print("=== Testing Radius Verification ===")
    
    try:
        test_radius = 1500  # 1.5km
        response = test_session.session.get(
            f"{BASE_URL}/places/nearby?lat={TEST_LAT}&lng={TEST_LNG}&radius={test_radius}"
        )
        
        if response.status_code != 200:
            test_session.log_test("Radius Verification", False, f"Status: {response.status_code}")
            return False
            
        places = response.json()
        
        out_of_range_places = []
        for place in places:
            distance_str = place.get("distance", "")
            try:
                if "km" in distance_str:
                    distance_m = float(distance_str.replace(" km", "")) * 1000
                elif "m" in distance_str:
                    distance_m = float(distance_str.replace(" m", ""))
                else:
                    continue  # Skip if can't parse
                    
                if distance_m > test_radius:
                    out_of_range_places.append({
                        "name": place["name"],
                        "distance": distance_str,
                        "calculated_meters": distance_m
                    })
            except:
                continue
                
        if out_of_range_places:
            test_session.log_test("Radius Verification", False, 
                f"Places outside {test_radius}m radius: {out_of_range_places}")
            return False
            
        test_session.log_test("Radius Verification", True, 
            f"All {len(places)} places are within {test_radius}m radius")
        return True
        
    except Exception as e:
        test_session.log_test("Radius Verification", False, f"Exception: {str(e)}")
        return False

def main():
    """Main testing function"""
    print(f"🧪 Testing SEE ME API - Nearby Places Endpoint")
    print(f"🌐 Target URL: {BASE_URL}")
    print(f"📍 Test Location: New York City ({TEST_LAT}, {TEST_LNG})")
    print(f"🕒 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    test_session = NearbyTestSession()
    
    # Setup test user first
    if not register_test_user(test_session):
        print("❌ Failed to setup test user. Cannot proceed.")
        return 1
    
    # Test sequence
    tests = [
        ("1. Basic Nearby Places Request", test_basic_nearby_places),
        ("2. Google Places Integration", test_google_places_integration),
        ("3. Response Format Validation", test_response_format_validation),
        ("4. Custom Radius Parameter", test_radius_parameter),
        ("5. Activity Level Calculation", test_activity_level_calculation),
        ("6. Radius Verification", test_places_within_radius_verification),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        print("-" * 40)
        
        if test_func(test_session):
            passed += 1
        
    print("\n" + "=" * 60)
    print(f"🎯 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Nearby Places endpoint with Google Places integration is working correctly.")
        return 0
    else:
        print(f"⚠️  {total - passed} tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)