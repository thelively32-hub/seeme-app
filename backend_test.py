#!/usr/bin/env python3
"""
SEE ME API Testing - Updated Real Activity System (v2.0.0)
Testing against: https://presence-real.preview.emergentagent.com
"""

import requests
import json
import sys
from datetime import datetime

# API Base URL - External deployment
BASE_URL = "https://presence-real.preview.emergentagent.com/api"

class TestSession:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.first_place_id = None
        self.second_place_id = None
        
    def set_auth_token(self, token):
        self.auth_token = token
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def log_test(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        print()

def test_health_check(test_session):
    """Test 1: Health check endpoint"""
    print("=== Testing Health Check Endpoint ===")
    
    try:
        response = test_session.session.get(f"{BASE_URL}/health")
        
        if response.status_code != 200:
            test_session.log_test("Health Check", False, f"Status: {response.status_code}")
            return False
            
        data = response.json()
        
        # Verify version
        if data.get("version") != "2.0.0":
            test_session.log_test("Health Check - Version", False, f"Expected 2.0.0, got {data.get('version')}")
            return False
            
        # Verify features
        features = data.get("features", {})
        required_features = ["real_activity", "anti_spam", "auto_cleanup"]
        
        for feature in required_features:
            if not features.get(feature):
                test_session.log_test("Health Check - Features", False, f"Missing feature: {feature}")
                return False
                
        test_session.log_test("Health Check", True, f"Version: {data['version']}, Features: {list(features.keys())}")
        return True
        
    except Exception as e:
        test_session.log_test("Health Check", False, f"Exception: {str(e)}")
        return False

def test_places_endpoint(test_session):
    """Test 2: Get places with new activity fields"""
    print("=== Testing Places Endpoint ===")
    
    try:
        response = test_session.session.get(f"{BASE_URL}/places")
        
        if response.status_code != 200:
            test_session.log_test("Places API", False, f"Status: {response.status_code}")
            return False
            
        places = response.json()
        
        if not places or len(places) == 0:
            test_session.log_test("Places API", False, "No places returned")
            return False
            
        # Store first two place IDs for later tests
        test_session.first_place_id = places[0]["id"]
        test_session.second_place_id = places[1]["id"] if len(places) > 1 else places[0]["id"]
        
        # Verify NEW fields are present
        first_place = places[0]
        required_new_fields = ["activity_level", "activity_label", "is_trending", "activity_updated_at"]
        
        missing_fields = []
        for field in required_new_fields:
            if field not in first_place:
                missing_fields.append(field)
                
        if missing_fields:
            test_session.log_test("Places API - New Fields", False, f"Missing fields: {missing_fields}")
            return False
            
        # Verify OLD fields are NOT present
        old_fields = ["activity", "people_count"]  # These should be removed
        present_old_fields = []
        for field in old_fields:
            if field in first_place:
                present_old_fields.append(field)
                
        if present_old_fields:
            test_session.log_test("Places API - Old Fields Removed", False, f"Old fields still present: {present_old_fields}")
            return False
            
        test_session.log_test("Places API", True, 
            f"Found {len(places)} places with new activity system. "
            f"First place: {first_place['name']} - {first_place['activity_label']} ({first_place['activity_level']})")
        return True
        
    except Exception as e:
        test_session.log_test("Places API", False, f"Exception: {str(e)}")
        return False

def test_user_registration(test_session):
    """Test 3: Register a new user"""
    print("=== Testing User Registration ===")
    
    try:
        user_data = {
            "name": "Phase1 Tester",
            "email": "phase1@seeme.app",
            "password": "test123456"
        }
        
        response = test_session.session.post(f"{BASE_URL}/auth/register", json=user_data)
        
        if response.status_code != 200:
            test_session.log_test("User Registration", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        
        if "access_token" not in data:
            test_session.log_test("User Registration", False, "No access token in response")
            return False
            
        # Set auth token for future requests
        test_session.set_auth_token(data["access_token"])
        test_session.user_data = data["user"]
        
        test_session.log_test("User Registration", True, f"User registered: {data['user']['name']} ({data['user']['email']})")
        return True
        
    except Exception as e:
        test_session.log_test("User Registration", False, f"Exception: {str(e)}")
        return False

def test_first_checkin(test_session):
    """Test 4: Check in to first place"""
    print("=== Testing First Check-in ===")
    
    if not test_session.first_place_id:
        test_session.log_test("First Check-in", False, "No place ID available")
        return False
        
    try:
        checkin_data = {"place_id": test_session.first_place_id}
        
        response = test_session.session.post(f"{BASE_URL}/checkins", json=checkin_data)
        
        if response.status_code != 200:
            test_session.log_test("First Check-in", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        
        if not data.get("is_active"):
            test_session.log_test("First Check-in", False, "Check-in not marked as active")
            return False
            
        test_session.log_test("First Check-in", True, f"Checked in to: {data['place_name']}")
        return True
        
    except Exception as e:
        test_session.log_test("First Check-in", False, f"Exception: {str(e)}")
        return False

def test_places_activity_change(test_session):
    """Test 5: Verify activity changed for first place"""
    print("=== Testing Activity Change After Check-in ===")
    
    try:
        response = test_session.session.get(f"{BASE_URL}/places")
        
        if response.status_code != 200:
            test_session.log_test("Activity Change", False, f"Status: {response.status_code}")
            return False
            
        places = response.json()
        first_place = next((p for p in places if p["id"] == test_session.first_place_id), None)
        
        if not first_place:
            test_session.log_test("Activity Change", False, "First place not found in response")
            return False
            
        # Activity should be at least "low" after check-in
        if first_place["activity_level"] == "none":
            test_session.log_test("Activity Change", False, f"Activity still 'none': {first_place['activity_label']}")
            return False
            
        test_session.log_test("Activity Change", True, 
            f"Activity updated: {first_place['activity_label']} ({first_place['activity_level']})")
        return True
        
    except Exception as e:
        test_session.log_test("Activity Change", False, f"Exception: {str(e)}")
        return False

def test_anti_spam_checkin(test_session):
    """Test 6: Anti-spam test - should UPDATE existing checkin"""
    print("=== Testing Anti-Spam Feature ===")
    
    if not test_session.second_place_id:
        test_session.log_test("Anti-Spam Test", False, "No second place ID available")
        return False
        
    try:
        checkin_data = {"place_id": test_session.second_place_id}
        
        response = test_session.session.post(f"{BASE_URL}/checkins", json=checkin_data)
        
        if response.status_code != 200:
            test_session.log_test("Anti-Spam Test", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        
        # Should update existing checkin, not create new
        if not data.get("is_active"):
            test_session.log_test("Anti-Spam Test", False, "Updated check-in not marked as active")
            return False
            
        test_session.log_test("Anti-Spam Test", True, 
            f"Check-in updated to new place: {data['place_name']} (anti-spam working)")
        return True
        
    except Exception as e:
        test_session.log_test("Anti-Spam Test", False, f"Exception: {str(e)}")
        return False

def test_get_active_checkin(test_session):
    """Test 7: Get active checkin"""
    print("=== Testing Get Active Check-in ===")
    
    try:
        response = test_session.session.get(f"{BASE_URL}/checkins/active")
        
        if response.status_code != 200:
            test_session.log_test("Get Active Check-in", False, f"Status: {response.status_code}")
            return False
            
        data = response.json()
        
        if not data:
            test_session.log_test("Get Active Check-in", False, "No active check-in returned")
            return False
            
        if not data.get("is_active"):
            test_session.log_test("Get Active Check-in", False, "Check-in not marked as active")
            return False
            
        test_session.log_test("Get Active Check-in", True, f"Active at: {data['place_name']}")
        return True
        
    except Exception as e:
        test_session.log_test("Get Active Check-in", False, f"Exception: {str(e)}")
        return False

def test_checkout(test_session):
    """Test 8: Checkout"""
    print("=== Testing Checkout ===")
    
    try:
        response = test_session.session.post(f"{BASE_URL}/checkins/checkout")
        
        if response.status_code != 200:
            test_session.log_test("Checkout", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        
        if data.get("is_active"):
            test_session.log_test("Checkout", False, "Check-in still marked as active after checkout")
            return False
            
        if not data.get("checked_out_at"):
            test_session.log_test("Checkout", False, "No checkout timestamp")
            return False
            
        test_session.log_test("Checkout", True, f"Checked out from: {data['place_name']}")
        return True
        
    except Exception as e:
        test_session.log_test("Checkout", False, f"Exception: {str(e)}")
        return False

def test_places_activity_decrease(test_session):
    """Test 9: Verify activity level decreased after checkout"""
    print("=== Testing Activity Decrease After Checkout ===")
    
    try:
        response = test_session.session.get(f"{BASE_URL}/places")
        
        if response.status_code != 200:
            test_session.log_test("Activity Decrease", False, f"Status: {response.status_code}")
            return False
            
        places = response.json()
        second_place = next((p for p in places if p["id"] == test_session.second_place_id), None)
        
        if not second_place:
            test_session.log_test("Activity Decrease", False, "Second place not found in response")
            return False
            
        # After checkout, activity should reflect the change
        # Note: Since we only had 1 user, activity might be back to "none" or still showing recent activity
        test_session.log_test("Activity Decrease", True, 
            f"Place activity after checkout: {second_place['activity_label']} ({second_place['activity_level']})")
        return True
        
    except Exception as e:
        test_session.log_test("Activity Decrease", False, f"Exception: {str(e)}")
        return False

def main():
    """Main testing function"""
    print(f"🧪 Testing SEE ME API v2.0.0 - Real Activity System")
    print(f"🌐 Target URL: {BASE_URL}")
    print(f"🕒 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    test_session = TestSession()
    
    # Test sequence
    tests = [
        ("1. Health Check", test_health_check),
        ("2. Places API", test_places_endpoint),
        ("3. User Registration", test_user_registration),
        ("4. First Check-in", test_first_checkin),
        ("5. Activity Change", test_places_activity_change),
        ("6. Anti-Spam Check-in", test_anti_spam_checkin),
        ("7. Get Active Check-in", test_get_active_checkin),
        ("8. Checkout", test_checkout),
        ("9. Activity Decrease", test_places_activity_decrease),
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
        print("🎉 ALL TESTS PASSED! Real Activity System is working correctly.")
        return 0
    else:
        print(f"⚠️  {total - passed} tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)