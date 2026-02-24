#!/usr/bin/env python3
"""
SEE ME API Error Handling Tests
Tests API error scenarios and edge cases
"""

import requests
import json

BASE_URL = "https://presence-real.preview.emergentagent.com"

def test_error_scenarios():
    """Test various error scenarios"""
    print("=== Testing Error Handling ===\n")
    
    # Test 1: Invalid endpoints
    print("1. Testing invalid endpoint...")
    response = requests.get(f"{BASE_URL}/api/invalid")
    print(f"   GET /api/invalid: {response.status_code}")
    
    # Test 2: Unauthorized access
    print("2. Testing unauthorized access...")
    response = requests.get(f"{BASE_URL}/api/auth/me")
    print(f"   GET /api/auth/me (no token): {response.status_code}")
    
    # Test 3: Invalid place ID
    print("3. Testing invalid place ID...")
    response = requests.get(f"{BASE_URL}/api/places/invalid_id")
    print(f"   GET /api/places/invalid_id: {response.status_code}")
    
    # Test 4: Duplicate user registration
    print("4. Testing duplicate email registration...")
    user_data = {
        "name": "Test User",
        "email": "test@seeme.app",  # Use the same email from review request
        "password": "password123"
    }
    
    # Register once
    response1 = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
    print(f"   First registration: {response1.status_code}")
    
    # Try to register again with same email
    response2 = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
    print(f"   Duplicate registration: {response2.status_code}")
    if response2.status_code == 400:
        print(f"   Proper error handling: {response2.json().get('detail', 'No error message')}")
    
    # Test 5: Invalid login credentials
    print("5. Testing invalid login...")
    bad_login = {
        "email": "nonexistent@test.com",
        "password": "wrongpass"
    }
    response = requests.post(f"{BASE_URL}/api/auth/login", json=bad_login)
    print(f"   Invalid login: {response.status_code}")
    if response.status_code == 401:
        print(f"   Proper error handling: {response.json().get('detail', 'No error message')}")
    
    print("\n=== Error Handling Test Complete ===")

if __name__ == "__main__":
    test_error_scenarios()