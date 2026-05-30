#!/usr/bin/env python3
"""
Backend API Testing Script for SEE ME App
Tests authentication endpoints and core functionality
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from environment configuration
BACKEND_URL = "https://presence-real.preview.emergentagent.com/api"

# Test data
TEST_USER = {
    "name": "Test User",
    "email": "testuser_backend@test.com",
    "password": "testpassword123"
}

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test(test_name):
    """Print test name"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}TEST: {test_name}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

def print_success(message):
    """Print success message"""
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message):
    """Print error message"""
    print(f"{RED}✗ {message}{RESET}")

def print_info(message):
    """Print info message"""
    print(f"{YELLOW}ℹ {message}{RESET}")

def test_health_endpoint():
    """Test 1: Health check endpoint"""
    print_test("Health Check Endpoint")
    
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_info(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify expected fields
            if data.get("status") == "healthy":
                print_success("Health endpoint returned healthy status")
            else:
                print_error(f"Unexpected status: {data.get('status')}")
                return False
            
            if "version" in data:
                print_success(f"API Version: {data['version']}")
            
            if "features" in data:
                print_success(f"Features: {', '.join(data['features'].keys())}")
            
            return True
        else:
            print_error(f"Health check failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print_error(f"Health check failed: {str(e)}")
        return False

def test_login_invalid_credentials():
    """Test 2: Login with invalid credentials (should return 401)"""
    print_test("Login with Invalid Credentials")
    
    try:
        invalid_credentials = {
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json=invalid_credentials,
            timeout=10
        )
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print_success("Correctly returned 401 for invalid credentials")
            data = response.json()
            print_info(f"Error message: {data.get('detail')}")
            return True
        else:
            print_error(f"Expected 401, got {response.status_code}")
            return False
            
    except Exception as e:
        print_error(f"Invalid login test failed: {str(e)}")
        return False

def test_register_user():
    """Test 3: Register a new user"""
    print_test("Register New User")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/auth/register",
            json=TEST_USER,
            timeout=10
        )
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_info(f"Response keys: {list(data.keys())}")
            
            # Verify access_token
            if "access_token" in data:
                print_success(f"Access token received: {data['access_token'][:20]}...")
            else:
                print_error("No access_token in response")
                return False, None
            
            # Verify user object
            if "user" in data:
                user = data["user"]
                print_success(f"User created with ID: {user.get('id')}")
                print_success(f"User name: {user.get('name')}")
                print_success(f"User email: {user.get('email')}")
                
                # Verify expected fields
                expected_fields = ["id", "name", "email", "vibes", "connection_rate", "is_premium", "created_at"]
                for field in expected_fields:
                    if field in user:
                        print_success(f"Field '{field}' present: {user[field]}")
                    else:
                        print_error(f"Missing field: {field}")
                
                return True, data["access_token"]
            else:
                print_error("No user object in response")
                return False, None
        elif response.status_code == 400:
            # User might already exist
            data = response.json()
            if "already registered" in data.get("detail", "").lower():
                print_info("User already exists, attempting login instead...")
                return test_login_existing_user()
            else:
                print_error(f"Registration failed: {data.get('detail')}")
                return False, None
        else:
            print_error(f"Registration failed with status {response.status_code}")
            print_info(f"Response: {response.text}")
            return False, None
            
    except Exception as e:
        print_error(f"Registration test failed: {str(e)}")
        return False, None

def test_login_existing_user():
    """Test 4: Login with registered credentials"""
    print_test("Login with Registered Credentials")
    
    try:
        credentials = {
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
        
        response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json=credentials,
            timeout=10
        )
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify access_token
            if "access_token" in data:
                print_success(f"Login successful, access token received")
                print_info(f"Token: {data['access_token'][:20]}...")
            else:
                print_error("No access_token in response")
                return False, None
            
            # Verify user object
            if "user" in data:
                user = data["user"]
                print_success(f"User ID: {user.get('id')}")
                print_success(f"User name: {user.get('name')}")
                print_success(f"User email: {user.get('email')}")
                
                return True, data["access_token"]
            else:
                print_error("No user object in response")
                return False, None
        else:
            print_error(f"Login failed with status {response.status_code}")
            print_info(f"Response: {response.text}")
            return False, None
            
    except Exception as e:
        print_error(f"Login test failed: {str(e)}")
        return False, None

def test_get_user_profile(access_token):
    """Test 5: Get user profile with access token"""
    print_test("Get User Profile (/api/auth/me)")
    
    try:
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        response = requests.get(
            f"{BACKEND_URL}/auth/me",
            headers=headers,
            timeout=10
        )
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            user = response.json()
            print_info(f"Response keys: {list(user.keys())}")
            
            # Verify user fields
            print_success(f"User ID: {user.get('id')}")
            print_success(f"User name: {user.get('name')}")
            print_success(f"User email: {user.get('email')}")
            print_success(f"Vibes: {user.get('vibes')}")
            print_success(f"Connection rate: {user.get('connection_rate')}")
            print_success(f"Is premium: {user.get('is_premium')}")
            print_success(f"Is verified: {user.get('is_verified')}")
            
            # Verify email matches
            if user.get('email') == TEST_USER['email']:
                print_success("Email matches registered user")
            else:
                print_error(f"Email mismatch: expected {TEST_USER['email']}, got {user.get('email')}")
                return False
            
            return True
        else:
            print_error(f"Get profile failed with status {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Get profile test failed: {str(e)}")
        return False

def main():
    """Run all authentication tests"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}SEE ME API - Authentication Testing{RESET}")
    print(f"{BLUE}Backend URL: {BACKEND_URL}{RESET}")
    print(f"{BLUE}Timestamp: {datetime.utcnow().isoformat()}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    results = {}
    
    # Test 1: Health check
    results['health'] = test_health_endpoint()
    
    # Test 2: Invalid login
    results['invalid_login'] = test_login_invalid_credentials()
    
    # Test 3: Register user
    register_success, access_token = test_register_user()
    results['register'] = register_success
    
    # Test 4: Login with registered credentials (if registration failed)
    if not register_success or not access_token:
        login_success, access_token = test_login_existing_user()
        results['login'] = login_success
    else:
        results['login'] = True  # Registration already logged in
    
    # Test 5: Get user profile
    if access_token:
        results['get_profile'] = test_get_user_profile(access_token)
    else:
        print_error("Skipping profile test - no access token available")
        results['get_profile'] = False
    
    # Print summary
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() if result)
    
    for test_name, result in results.items():
        status = f"{GREEN}PASS{RESET}" if result else f"{RED}FAIL{RESET}"
        print(f"{test_name.upper()}: {status}")
    
    print(f"\n{BLUE}Total: {passed_tests}/{total_tests} tests passed{RESET}")
    
    if passed_tests == total_tests:
        print(f"{GREEN}All tests passed! ✓{RESET}\n")
        return 0
    else:
        print(f"{RED}Some tests failed! ✗{RESET}\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
