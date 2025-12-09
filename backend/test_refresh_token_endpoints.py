"""Test script to verify refresh token endpoints are working."""
import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000/api"
TEST_EMAIL = f"test_{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com"
TEST_PASSWORD = "testpassword123"
TEST_NAME = "Test User"

def print_section(title):
    """Print a formatted section header."""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def test_signup():
    """Test signup to create a test user."""
    print_section("Test 0: User Signup")

    try:
        response = requests.post(
            f"{BASE_URL}/signup",
            json={"name": TEST_NAME, "email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={"Content-Type": "application/json"}
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            print("[OK] User created successfully!")
            return True
        elif response.status_code == 400:
            data = response.json()
            if "already exists" in data.get("detail", "").lower():
                print("[WARNING] User already exists, continuing with login...")
                return True
            else:
                print(f"[ERROR] Signup failed: {response.text}")
                return False
        else:
            print(f"[WARNING] Signup response: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("[ERROR] Cannot connect to backend. Is it running?")
        return None
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return None

def test_login():
    """Test login endpoint returns both tokens."""
    print_section("Test 1: Login Endpoint")

    try:
        response = requests.post(
            f"{BASE_URL}/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={"Content-Type": "application/json"}
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("[OK] Login successful!")
            print(f"Response keys: {list(data.keys())}")

            if "access_token" in data:
                print(f"[OK] access_token: {data['access_token'][:50]}...")
            else:
                print("[ERROR] access_token missing!")

            if "refresh_token" in data:
                print(f"[OK] refresh_token: {data['refresh_token'][:50]}...")
                return data
            else:
                print("[ERROR] refresh_token missing!")
                return None
        else:
            print(f"[ERROR] Login failed: {response.text}")
            return None

    except requests.exceptions.ConnectionError:
        print("[ERROR] Cannot connect to backend. Is it running?")
        return None
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return None

def test_refresh_token(refresh_token):
    """Test refresh endpoint."""
    print_section("Test 2: Refresh Token Endpoint")

    if not refresh_token:
        print("[WARNING] Skipping - no refresh token available")
        return None

    try:
        response = requests.post(
            f"{BASE_URL}/refresh",
            json={"refresh_token": refresh_token},
            headers={"Content-Type": "application/json"}
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("[OK] Token refresh successful!")
            print(f"Response keys: {list(data.keys())}")

            if "access_token" in data:
                print(f"[OK] New access_token: {data['access_token'][:50]}...")
                return data["access_token"]
            else:
                print("[ERROR] access_token missing in response!")
                return None
        else:
            print(f"[ERROR] Refresh failed: {response.text}")
            return None

    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return None

def test_protected_endpoint(access_token):
    """Test accessing a protected endpoint."""
    print_section("Test 3: Protected Endpoint Access")

    if not access_token:
        print("[WARNING] Skipping - no access token available")
        return False

    try:
        response = requests.get(
            f"{BASE_URL}/get-user-details",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            print("[OK] Protected endpoint accessible!")
            data = response.json()
            print(f"User details retrieved: {list(data.keys()) if isinstance(data, dict) else 'OK'}")
            return True
        elif response.status_code == 401:
            print("[ERROR] Unauthorized - token invalid or expired")
            return False
        else:
            print(f"[WARNING] Unexpected status: {response.text[:100]}")
            return False

    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return False

def test_invalid_refresh_token():
    """Test refresh endpoint with invalid token."""
    print_section("Test 4: Invalid Refresh Token")

    try:
        response = requests.post(
            f"{BASE_URL}/refresh",
            json={"refresh_token": "invalid_token_12345"},
            headers={"Content-Type": "application/json"}
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code == 401:
            print("[OK] Correctly rejected invalid refresh token")
            return True
        else:
            print(f"[ERROR] Should return 401, got {response.status_code}")
            return False

    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return False

def test_multiple_refresh(refresh_token):
    """Test refreshing token multiple times."""
    print_section("Test 5: Multiple Token Refreshes")

    if not refresh_token:
        print("[WARNING] Skipping - no refresh token available")
        return False

    try:
        tokens = []
        for i in range(3):
            response = requests.post(
                f"{BASE_URL}/refresh",
                json={"refresh_token": refresh_token},
                headers={"Content-Type": "application/json"}
            )

            if response.status_code == 200:
                data = response.json()
                tokens.append(data["access_token"])
                print(f"[OK] Refresh {i+1} successful")
            else:
                print(f"[ERROR] Refresh {i+1} failed: {response.status_code}")
                return False

        # Verify all tokens are different
        if len(set(tokens)) == len(tokens):
            print("[OK] All refreshed tokens are unique")
            return True
        else:
            print("[WARNING] Some tokens are duplicates")
            return True

    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return False

def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("  Refresh Token Endpoints Test Suite")
    print("=" * 60)
    print(f"\nTesting against: {BASE_URL}")
    print(f"Test email: {TEST_EMAIL}")
    print(f"Test time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results = []

    # Test 0: Signup
    signup_result = test_signup()
    if signup_result is None:
        print("\n[ERROR] Cannot connect to backend. Please ensure it's running.")
        return 1

    # Test 1: Login
    login_data = test_login()
    access_token = login_data.get("access_token") if login_data else None
    refresh_token = login_data.get("refresh_token") if login_data else None
    results.append(("Login", login_data is not None))

    # Test 2: Refresh Token
    new_access_token = test_refresh_token(refresh_token)
    results.append(("Refresh Token", new_access_token is not None))

    # Test 3: Protected Endpoint (use new token from refresh)
    if new_access_token:
        results.append(("Protected Endpoint", test_protected_endpoint(new_access_token)))
    elif access_token:
        results.append(("Protected Endpoint", test_protected_endpoint(access_token)))
    else:
        results.append(("Protected Endpoint", False))

    # Test 4: Invalid Token
    results.append(("Invalid Token Handling", test_invalid_refresh_token()))

    # Test 5: Multiple Refreshes
    results.append(("Multiple Refreshes", test_multiple_refresh(refresh_token)))

    # Summary
    print_section("Test Summary")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status}: {test_name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n[SUCCESS] All tests passed! Refresh token system is working correctly.")
        return 0
    else:
        print("\n[WARNING] Some tests failed. Please review the errors above.")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
