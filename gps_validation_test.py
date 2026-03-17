#!/usr/bin/env python3
"""
SEE ME GPS Validation System Test
Testing the GPS validation endpoints as specified in the testing request
Target: https://presence-real.preview.emergentagent.com
"""

import requests
import json
import sys
from datetime import datetime

# API Base URL - External deployment
BASE_URL = "https://presence-real.preview.emergentagent.com/api"

class GPSTestSession:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.place_id = None
        self.place_latitude = None
        self.place_longitude = None
        
    def set_auth_token(self, token):
        self.auth_token = token
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def log_test(self, test_name, success, details="", expected="", actual=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if expected:
            print(f"   Expected: {expected}")
        if actual:
            print(f"   Actual: {actual}")
        print()

def test_gps_user_registration(test_session):
    """Test 1: Register a GPS tester user"""
    print("=== Testing GPS User Registration ===")
    
    try:
        user_data = {
            "name": "GPS Tester",
            "email": "gps@seeme.app",
            "password": "test123456"
        }
        
        response = test_session.session.post(f"{BASE_URL}/auth/register", json=user_data)
        
        if response.status_code != 200:
            test_session.log_test("GPS User Registration", False, 
                f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        
        if "access_token" not in data:
            test_session.log_test("GPS User Registration", False, "No access token in response")
            return False
            
        # Set auth token for future requests
        test_session.set_auth_token(data["access_token"])
        test_session.user_data = data["user"]
        
        test_session.log_test("GPS User Registration", True, 
            f"User registered: {data['user']['name']} ({data['user']['email']})")
        return True
        
    except Exception as e:
        test_session.log_test("GPS User Registration", False, f"Exception: {str(e)}")
        return False

def test_get_places_for_gps(test_session):
    """Test 2: Get places to get place_id and coordinates"""
    print("=== Testing Get Places for GPS Testing ===")
    
    try:
        response = test_session.session.get(f"{BASE_URL}/places")
        
        if response.status_code != 200:
            test_session.log_test("Get Places for GPS", False, f"Status: {response.status_code}")
            return False
            
        places = response.json()
        
        if not places or len(places) == 0:
            test_session.log_test("Get Places for GPS", False, "No places returned")
            return False
            
        # Store first place for GPS testing
        first_place = places[0]
        test_session.place_id = first_place["id"]
        test_session.place_latitude = first_place["latitude"]
        test_session.place_longitude = first_place["longitude"]
        
        test_session.log_test("Get Places for GPS", True, 
            f"Place selected: {first_place['name']} at ({first_place['latitude']}, {first_place['longitude']})")
        return True
        
    except Exception as e:
        test_session.log_test("Get Places for GPS", False, f"Exception: {str(e)}")
        return False

def test_valid_location_validation(test_session):
    """Test 3: Test location validation with VALID location (close to place)"""
    print("=== Testing Valid Location Validation ===")
    
    if not test_session.place_id:
        test_session.log_test("Valid Location Validation", False, "No place ID available")
        return False
        
    try:
        validation_data = {
            "place_id": test_session.place_id,
            "user_latitude": test_session.place_latitude,
            "user_longitude": test_session.place_longitude,
            "gps_accuracy": 10,
            "is_mocked": False
        }
        
        response = test_session.session.post(f"{BASE_URL}/checkins/validate-location", json=validation_data)
        
        if response.status_code != 200:
            test_session.log_test("Valid Location Validation", False, 
                f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        
        # Check expected results
        expected_valid = True
        expected_can_checkin = True
        
        actual_valid = data.get("valid")
        actual_can_checkin = data.get("can_checkin")
        
        if actual_valid != expected_valid:
            test_session.log_test("Valid Location Validation", False,
                expected=f"valid={expected_valid}",
                actual=f"valid={actual_valid}")
            return False
            
        if actual_can_checkin != expected_can_checkin:
            test_session.log_test("Valid Location Validation", False,
                expected=f"can_checkin={expected_can_checkin}",
                actual=f"can_checkin={actual_can_checkin}")
            return False
            
        test_session.log_test("Valid Location Validation", True,
            f"Distance: {data.get('distance_meters')}m, Accuracy: {data.get('accuracy_meters')}m, Can check-in: {data.get('can_checkin')}")
        return True
        
    except Exception as e:
        test_session.log_test("Valid Location Validation", False, f"Exception: {str(e)}")
        return False

def test_bad_accuracy_validation(test_session):
    """Test 4: Test location validation with BAD ACCURACY"""
    print("=== Testing Bad Accuracy Validation ===")
    
    if not test_session.place_id:
        test_session.log_test("Bad Accuracy Validation", False, "No place ID available")
        return False
        
    try:
        validation_data = {
            "place_id": test_session.place_id,
            "user_latitude": test_session.place_latitude,
            "user_longitude": test_session.place_longitude,
            "gps_accuracy": 100,  # Bad accuracy > 50m threshold
            "is_mocked": False
        }
        
        response = test_session.session.post(f"{BASE_URL}/checkins/validate-location", json=validation_data)
        
        if response.status_code != 200:
            test_session.log_test("Bad Accuracy Validation", False, 
                f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        
        # Check expected results
        expected_valid = False
        expected_accuracy_acceptable = False
        
        actual_valid = data.get("valid")
        actual_accuracy_acceptable = data.get("accuracy_acceptable")
        
        if actual_valid != expected_valid:
            test_session.log_test("Bad Accuracy Validation", False,
                expected=f"valid={expected_valid}",
                actual=f"valid={actual_valid}")
            return False
            
        if actual_accuracy_acceptable != expected_accuracy_acceptable:
            test_session.log_test("Bad Accuracy Validation", False,
                expected=f"accuracy_acceptable={expected_accuracy_acceptable}",
                actual=f"accuracy_acceptable={actual_accuracy_acceptable}")
            return False
            
        test_session.log_test("Bad Accuracy Validation", True,
            f"Accuracy: {data.get('accuracy_meters')}m rejected correctly, Error: {data.get('error_message')}")
        return True
        
    except Exception as e:
        test_session.log_test("Bad Accuracy Validation", False, f"Exception: {str(e)}")
        return False

def test_mocked_location_validation(test_session):
    """Test 5: Test location validation with MOCKED LOCATION"""
    print("=== Testing Mocked Location Validation ===")
    
    if not test_session.place_id:
        test_session.log_test("Mocked Location Validation", False, "No place ID available")
        return False
        
    try:
        validation_data = {
            "place_id": test_session.place_id,
            "user_latitude": test_session.place_latitude,
            "user_longitude": test_session.place_longitude,
            "gps_accuracy": 10,  # Good accuracy
            "is_mocked": True   # But mocked location
        }
        
        response = test_session.session.post(f"{BASE_URL}/checkins/validate-location", json=validation_data)
        
        if response.status_code != 200:
            test_session.log_test("Mocked Location Validation", False, 
                f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        
        # Check expected results
        expected_valid = False
        
        actual_valid = data.get("valid")
        error_message = data.get("error_message", "")
        
        if actual_valid != expected_valid:
            test_session.log_test("Mocked Location Validation", False,
                expected=f"valid={expected_valid}",
                actual=f"valid={actual_valid}")
            return False
            
        # Check if error mentions mock location
        if "mock" not in error_message.lower():
            test_session.log_test("Mocked Location Validation", False,
                f"Error message should mention mock location: {error_message}")
            return False
            
        test_session.log_test("Mocked Location Validation", True,
            f"Mocked location rejected correctly, Error: {error_message}")
        return True
        
    except Exception as e:
        test_session.log_test("Mocked Location Validation", False, f"Exception: {str(e)}")
        return False

def test_far_away_validation(test_session):
    """Test 6: Test location validation FAR AWAY (add 0.01 to latitude = ~1km)"""
    print("=== Testing Far Away Location Validation ===")
    
    if not test_session.place_id:
        test_session.log_test("Far Away Validation", False, "No place ID available")
        return False
        
    try:
        # Add 0.01 to latitude (~1km away)
        far_latitude = test_session.place_latitude + 0.01
        
        validation_data = {
            "place_id": test_session.place_id,
            "user_latitude": far_latitude,
            "user_longitude": test_session.place_longitude,
            "gps_accuracy": 10,
            "is_mocked": False
        }
        
        response = test_session.session.post(f"{BASE_URL}/checkins/validate-location", json=validation_data)
        
        if response.status_code != 200:
            test_session.log_test("Far Away Validation", False, 
                f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        
        # Check expected results
        expected_valid = False
        expected_within_radius = False
        
        actual_valid = data.get("valid")
        actual_within_radius = data.get("within_radius")
        
        if actual_valid != expected_valid:
            test_session.log_test("Far Away Validation", False,
                expected=f"valid={expected_valid}",
                actual=f"valid={actual_valid}")
            return False
            
        if actual_within_radius != expected_within_radius:
            test_session.log_test("Far Away Validation", False,
                expected=f"within_radius={expected_within_radius}",
                actual=f"within_radius={actual_within_radius}")
            return False
            
        test_session.log_test("Far Away Validation", True,
            f"Distance: {data.get('distance_meters')}m rejected correctly, Error: {data.get('error_message')}")
        return True
        
    except Exception as e:
        test_session.log_test("Far Away Validation", False, f"Exception: {str(e)}")
        return False

def test_valid_checkin(test_session):
    """Test 7: Test check-in with VALID location"""
    print("=== Testing Valid Check-in ===")
    
    if not test_session.place_id:
        test_session.log_test("Valid Check-in", False, "No place ID available")
        return False
        
    try:
        checkin_data = {
            "place_id": test_session.place_id,
            "user_latitude": test_session.place_latitude,
            "user_longitude": test_session.place_longitude,
            "gps_accuracy": 10,
            "is_mocked": False
        }
        
        response = test_session.session.post(f"{BASE_URL}/checkins", json=checkin_data)
        
        if response.status_code != 200:
            test_session.log_test("Valid Check-in", False, 
                f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        data = response.json()
        
        # Check that check-in was successful
        if not data.get("is_active"):
            test_session.log_test("Valid Check-in", False, "Check-in not marked as active")
            return False
            
        if not data.get("id"):
            test_session.log_test("Valid Check-in", False, "No check-in ID returned")
            return False
            
        test_session.log_test("Valid Check-in", True,
            f"Successfully checked into: {data.get('place_name')}")
        return True
        
    except Exception as e:
        test_session.log_test("Valid Check-in", False, f"Exception: {str(e)}")
        return False

def test_invalid_location_checkin(test_session):
    """Test 8: Test check-in with INVALID location (too far)"""
    print("=== Testing Invalid Location Check-in ===")
    
    if not test_session.place_id:
        test_session.log_test("Invalid Location Check-in", False, "No place ID available")
        return False
        
    try:
        # Add 0.01 to latitude (~1km away)
        far_latitude = test_session.place_latitude + 0.01
        
        checkin_data = {
            "place_id": test_session.place_id,
            "user_latitude": far_latitude,
            "user_longitude": test_session.place_longitude,
            "gps_accuracy": 10,
            "is_mocked": False
        }
        
        response = test_session.session.post(f"{BASE_URL}/checkins", json=checkin_data)
        
        # Expect 400 error for invalid location
        if response.status_code != 400:
            test_session.log_test("Invalid Location Check-in", False,
                expected="400 error for too far location",
                actual=f"Status: {response.status_code}")
            return False
            
        # Check if response contains user-friendly error message
        try:
            error_data = response.json()
            if isinstance(error_data, dict) and "detail" in error_data:
                detail = error_data["detail"]
                if isinstance(detail, dict):
                    error_msg = detail.get("message", "")
                else:
                    error_msg = str(detail)
            else:
                error_msg = str(error_data)
        except:
            error_msg = response.text
            
        test_session.log_test("Invalid Location Check-in", True,
            f"Correctly rejected far location with error: {error_msg}")
        return True
        
    except Exception as e:
        test_session.log_test("Invalid Location Check-in", False, f"Exception: {str(e)}")
        return False

def main():
    """Main GPS validation testing function"""
    print(f"🧪 Testing SEE ME GPS Validation System")
    print(f"🌐 Target URL: {BASE_URL}")
    print(f"🕒 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    test_session = GPSTestSession()
    
    # GPS Test sequence
    tests = [
        ("1. GPS User Registration", test_gps_user_registration),
        ("2. Get Places for GPS", test_get_places_for_gps),
        ("3. Valid Location Validation", test_valid_location_validation),
        ("4. Bad Accuracy Validation", test_bad_accuracy_validation),
        ("5. Mocked Location Validation", test_mocked_location_validation),
        ("6. Far Away Location Validation", test_far_away_validation),
        ("7. Valid Check-in", test_valid_checkin),
        ("8. Invalid Location Check-in", test_invalid_location_checkin),
    ]
    
    passed = 0
    total = len(tests)
    failed_tests = []
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        print("-" * 40)
        
        if test_func(test_session):
            passed += 1
        else:
            failed_tests.append(test_name)
        
    print("\n" + "=" * 60)
    print(f"🎯 GPS Validation Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL GPS VALIDATION TESTS PASSED! GPS validation system is working correctly.")
        return 0
    else:
        print(f"⚠️  {total - passed} tests failed:")
        for failed_test in failed_tests:
            print(f"   - {failed_test}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)