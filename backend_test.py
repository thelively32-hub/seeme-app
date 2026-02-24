#!/usr/bin/env python3
"""
SEE ME API Backend Testing Suite
Tests all backend endpoints as specified in review request
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend env
BASE_URL = "https://presence-real.preview.emergentagent.com"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def log_test(test_name, status, details=""):
    status_color = Colors.GREEN if status == "PASS" else Colors.RED if status == "FAIL" else Colors.YELLOW
    print(f"{Colors.BOLD}[{status_color}{status}{Colors.END}{Colors.BOLD}]{Colors.END} {test_name}")
    if details:
        print(f"  {details}")
    print()

def test_health_check():
    """Test 1: Health check endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        
        if response.status_code == 200:
            data = response.json()
            expected_fields = ["status", "service", "version", "timestamp"]
            
            if all(field in data for field in expected_fields):
                if data["service"] == "SEE ME API" and data["status"] == "healthy":
                    log_test("Health Check", "PASS", f"Service is healthy: {data}")
                    return True, data
                else:
                    log_test("Health Check", "FAIL", f"Unexpected service data: {data}")
                    return False, data
            else:
                log_test("Health Check", "FAIL", f"Missing required fields in response: {data}")
                return False, data
        else:
            log_test("Health Check", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
            return False, None
            
    except Exception as e:
        log_test("Health Check", "FAIL", f"Exception: {str(e)}")
        return False, None

def test_get_places():
    """Test 2: Get places endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/places")
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, list) and len(data) > 0:
                # Check structure of first place
                place = data[0]
                required_fields = ["id", "name", "type", "address", "latitude", "longitude", 
                                 "activity", "people_count", "trending", "created_at"]
                
                if all(field in place for field in required_fields):
                    log_test("Get Places", "PASS", f"Retrieved {len(data)} places successfully")
                    return True, data
                else:
                    missing = [f for f in required_fields if f not in place]
                    log_test("Get Places", "FAIL", f"Missing fields in place object: {missing}")
                    return False, data
            else:
                log_test("Get Places", "FAIL", f"Expected non-empty array, got: {data}")
                return False, data
        else:
            log_test("Get Places", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
            return False, None
            
    except Exception as e:
        log_test("Get Places", "FAIL", f"Exception: {str(e)}")
        return False, None

def test_user_registration():
    """Test 3: Register new user"""
    try:
        # Create unique email for each test run
        timestamp = int(datetime.now().timestamp())
        test_email = f"testuser_{timestamp}@seeme.app"
        
        user_data = {
            "name": "Alex Rivera",
            "email": test_email,
            "password": "securepass123"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        
        if response.status_code == 200:
            data = response.json()
            
            if "access_token" in data and "user" in data:
                user = data["user"]
                required_fields = ["id", "name", "email", "vibes", "connection_rate", "is_premium", "created_at"]
                
                if all(field in user for field in required_fields):
                    if user["email"] == test_email and user["name"] == "Alex Rivera":
                        log_test("User Registration", "PASS", f"User registered successfully: {user['email']}")
                        return True, data
                    else:
                        log_test("User Registration", "FAIL", f"User data mismatch: {user}")
                        return False, data
                else:
                    missing = [f for f in required_fields if f not in user]
                    log_test("User Registration", "FAIL", f"Missing fields in user object: {missing}")
                    return False, data
            else:
                log_test("User Registration", "FAIL", f"Missing access_token or user in response: {data}")
                return False, data
        else:
            log_test("User Registration", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
            return False, None
            
    except Exception as e:
        log_test("User Registration", "FAIL", f"Exception: {str(e)}")
        return False, None

def test_user_login(email, password):
    """Test 4: User login"""
    try:
        login_data = {
            "email": email,
            "password": password
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            
            if "access_token" in data and "user" in data:
                user = data["user"]
                if user["email"] == email:
                    log_test("User Login", "PASS", f"User logged in successfully: {user['email']}")
                    return True, data
                else:
                    log_test("User Login", "FAIL", f"Email mismatch in response: {user}")
                    return False, data
            else:
                log_test("User Login", "FAIL", f"Missing access_token or user in response: {data}")
                return False, data
        else:
            log_test("User Login", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
            return False, None
            
    except Exception as e:
        log_test("User Login", "FAIL", f"Exception: {str(e)}")
        return False, None

def test_get_current_user(token):
    """Test 5: Get current user with token"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            required_fields = ["id", "name", "email", "vibes", "connection_rate", "is_premium", "created_at"]
            
            if all(field in data for field in required_fields):
                log_test("Get Current User", "PASS", f"User profile retrieved: {data['email']}")
                return True, data
            else:
                missing = [f for f in required_fields if f not in data]
                log_test("Get Current User", "FAIL", f"Missing fields in user object: {missing}")
                return False, data
        else:
            log_test("Get Current User", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
            return False, None
            
    except Exception as e:
        log_test("Get Current User", "FAIL", f"Exception: {str(e)}")
        return False, None

def test_set_vibe(token):
    """Test 6: Set user vibe"""
    try:
        vibe_data = {
            "gender": "man",
            "looking_for": ["women"],
            "intention": "date"
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.put(f"{BASE_URL}/api/auth/vibe", json=vibe_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            if (data.get("gender") == "man" and 
                data.get("looking_for") == ["women"] and 
                data.get("intention") == "date"):
                log_test("Set User Vibe", "PASS", f"Vibe updated successfully: {vibe_data}")
                return True, data
            else:
                log_test("Set User Vibe", "FAIL", f"Vibe data not updated correctly: {data}")
                return False, data
        else:
            log_test("Set User Vibe", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
            return False, None
            
    except Exception as e:
        log_test("Set User Vibe", "FAIL", f"Exception: {str(e)}")
        return False, None

def test_checkin_to_place(token, place_id):
    """Test 7: Check in to a place"""
    try:
        checkin_data = {"place_id": place_id}
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{BASE_URL}/api/checkins", json=checkin_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            required_fields = ["id", "user_id", "place_id", "place_name", "checked_in_at", "is_active"]
            
            if all(field in data for field in required_fields):
                if data["place_id"] == place_id and data["is_active"] == True:
                    log_test("Check In to Place", "PASS", f"Checked in to {data['place_name']} successfully")
                    return True, data
                else:
                    log_test("Check In to Place", "FAIL", f"Check-in data incorrect: {data}")
                    return False, data
            else:
                missing = [f for f in required_fields if f not in data]
                log_test("Check In to Place", "FAIL", f"Missing fields in check-in object: {missing}")
                return False, data
        else:
            log_test("Check In to Place", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
            return False, None
            
    except Exception as e:
        log_test("Check In to Place", "FAIL", f"Exception: {str(e)}")
        return False, None

def test_user_stats(token):
    """Test 8: Get user stats"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/stats/user", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            required_fields = ["vibes", "connection_rate", "total_checkins", "unique_places", "best_night", "is_premium"]
            
            if all(field in data for field in required_fields):
                log_test("Get User Stats", "PASS", f"User stats retrieved: {data}")
                return True, data
            else:
                missing = [f for f in required_fields if f not in data]
                log_test("Get User Stats", "FAIL", f"Missing fields in stats object: {missing}")
                return False, data
        else:
            log_test("Get User Stats", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
            return False, None
            
    except Exception as e:
        log_test("Get User Stats", "FAIL", f"Exception: {str(e)}")
        return False, None

def run_comprehensive_test():
    """Run all API tests in sequence"""
    print(f"{Colors.BOLD}{Colors.BLUE}=== SEE ME API Backend Testing Suite ==={Colors.END}")
    print(f"Testing backend at: {BASE_URL}")
    print()
    
    results = {}
    
    # Test 1: Health Check
    health_success, health_data = test_health_check()
    results["health"] = health_success
    
    # Test 2: Get Places
    places_success, places_data = test_get_places()
    results["places"] = places_success
    
    # Get first place ID for later use
    place_id = None
    if places_success and places_data:
        place_id = places_data[0]["id"]
    
    # Test 3: User Registration
    reg_success, reg_data = test_user_registration()
    results["registration"] = reg_success
    
    # Extract user info for subsequent tests
    token = None
    user_email = None
    if reg_success and reg_data:
        token = reg_data["access_token"]
        user_email = reg_data["user"]["email"]
    
    # Test 4: User Login (use registered user)
    if user_email:
        login_success, login_data = test_user_login(user_email, "securepass123")
        results["login"] = login_success
        
        # Use login token if available (more realistic)
        if login_success and login_data:
            token = login_data["access_token"]
    else:
        results["login"] = False
        log_test("User Login", "SKIP", "No registered user to test login")
    
    # Test 5: Get Current User
    if token:
        me_success, me_data = test_get_current_user(token)
        results["current_user"] = me_success
    else:
        results["current_user"] = False
        log_test("Get Current User", "SKIP", "No authentication token available")
    
    # Test 6: Set Vibe
    if token:
        vibe_success, vibe_data = test_set_vibe(token)
        results["set_vibe"] = vibe_success
    else:
        results["set_vibe"] = False
        log_test("Set User Vibe", "SKIP", "No authentication token available")
    
    # Test 7: Check In to Place
    if token and place_id:
        checkin_success, checkin_data = test_checkin_to_place(token, place_id)
        results["checkin"] = checkin_success
    else:
        results["checkin"] = False
        log_test("Check In to Place", "SKIP", "No authentication token or place ID available")
    
    # Test 8: User Stats
    if token:
        stats_success, stats_data = test_user_stats(token)
        results["stats"] = stats_success
    else:
        results["stats"] = False
        log_test("Get User Stats", "SKIP", "No authentication token available")
    
    # Summary
    print(f"{Colors.BOLD}{Colors.BLUE}=== TEST SUMMARY ==={Colors.END}")
    passed = sum(1 for success in results.values() if success)
    total = len(results)
    
    for test_name, success in results.items():
        status = "PASS" if success else "FAIL"
        color = Colors.GREEN if success else Colors.RED
        print(f"{color}• {test_name.upper()}: {status}{Colors.END}")
    
    print()
    print(f"{Colors.BOLD}Total: {passed}/{total} tests passed{Colors.END}")
    
    # Return results for programmatic use
    return results, passed == total

if __name__ == "__main__":
    results, all_passed = run_comprehensive_test()
    
    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)