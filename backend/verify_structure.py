"""Script to verify backend structure is properly organized."""
import sys
import os

def check_imports():
    """Check if all modules can be imported."""
    print("=" * 60)
    print("Checking Imports...")
    print("=" * 60)
    
    errors = []
    
    # Check config
    try:
        from config import settings
        print("✓ config.settings")
    except Exception as e:
        errors.append(f"✗ config.settings: {e}")
        print(f"✗ config.settings: {e}")
    
    # Check middleware
    try:
        from middleware import setup_cors, verify_token
        print("✓ middleware")
    except Exception as e:
        errors.append(f"✗ middleware: {e}")
        print(f"✗ middleware: {e}")
    
    # Check models
    try:
        from models import (
            UserSignup, UserLogin, SetRoleRequest, UpdateUserRequest,
            CompanyProfile, FreelancerProfile, PostJobRequest, PostProjectRequest
        )
        print("✓ models")
    except Exception as e:
        errors.append(f"✗ models: {e}")
        print(f"✗ models: {e}")
    
    # Check data layer
    try:
        from data import get_db, UserRepository, ProfileRepository, JobRepository, BillingRepository
        print("✓ data layer")
    except Exception as e:
        errors.append(f"✗ data layer: {e}")
        print(f"✗ data layer: {e}")
    
    # Check services
    try:
        from services import (
            AuthService, UserService, ProfileService,
            JobService, TalentService, BillingService
        )
        print("✓ services")
    except Exception as e:
        errors.append(f"✗ services: {e}")
        print(f"✗ services: {e}")
    
    # Check controllers
    try:
        from controllers import (
            AuthController, UserController, ProfileController,
            JobController, TalentController, BillingController
        )
        print("✓ controllers")
    except Exception as e:
        errors.append(f"✗ controllers: {e}")
        print(f"✗ controllers: {e}")
    
    # Check routes
    try:
        from routes import (
            auth_router, user_router, profile_router,
            job_router, talent_router, billing_router, api_router
        )
        print("✓ routes")
    except Exception as e:
        errors.append(f"✗ routes: {e}")
        print(f"✗ routes: {e}")
    
    # Check utils
    try:
        from utils import (
            create_access_token, get_weighted_embedding,
            perform_talent_match, chunk_text
        )
        print("✓ utils")
    except Exception as e:
        errors.append(f"✗ utils: {e}")
        print(f"✗ utils: {e}")
    
    # Check main app
    try:
        from app import app
        print("✓ app.py")
    except Exception as e:
        errors.append(f"✗ app.py: {e}")
        print(f"✗ app.py: {e}")
    
    return errors

def check_structure():
    """Check directory structure."""
    print("\n" + "=" * 60)
    print("Checking Directory Structure...")
    print("=" * 60)
    
    required_dirs = [
        "config", "middleware", "models", "data",
        "services", "controllers", "routes", "utils"
    ]
    
    missing_dirs = []
    for dir_name in required_dirs:
        if os.path.exists(dir_name) and os.path.isdir(dir_name):
            print(f"✓ {dir_name}/")
        else:
            missing_dirs.append(dir_name)
            print(f"✗ {dir_name}/ (missing)")
    
    return missing_dirs

def check_files():
    """Check required files exist."""
    print("\n" + "=" * 60)
    print("Checking Required Files...")
    print("=" * 60)
    
    required_files = {
        "app.py": "Main application",
        "config/__init__.py": "Config module",
        "config/settings.py": "Settings",
        "middleware/__init__.py": "Middleware module",
        "middleware/auth.py": "Auth middleware",
        "middleware/cors.py": "CORS middleware",
        "models/__init__.py": "Models module",
        "data/__init__.py": "Data module",
        "data/database.py": "Database utilities",
        "services/__init__.py": "Services module",
        "controllers/__init__.py": "Controllers module",
        "routes/__init__.py": "Routes module",
        "utils/__init__.py": "Utils module",
    }
    
    missing_files = []
    for file_path, description in required_files.items():
        if os.path.exists(file_path):
            print(f"✓ {file_path} ({description})")
        else:
            missing_files.append(file_path)
            print(f"✗ {file_path} ({description}) - MISSING")
    
    return missing_files

def check_routes():
    """Check if routes are registered."""
    print("\n" + "=" * 60)
    print("Checking Route Registration...")
    print("=" * 60)
    
    try:
        from app import app
        
        route_paths = [route.path for route in app.routes]
        
        expected_routes = [
            "/",
            "/signup",
            "/login",
            "/get-user-details",
            "/check-profile-completion",
            "/set-role",
            "/update-user-details",
            "/change-password",
            "/create-company-profile",
            "/create-freelancer-profile",
            "/create-job-seeker-profile",
            "/get-company-posts",
            "/post-job",
            "/post-project",
            "/talent-match",
            "/subscription",
            "/payment-methods",
            "/billing-history",
            "/notification-preferences",
            "/api/get-profile-id",
            "/api/jobs",
            "/api/projects",
            "/api/candidates",
        ]
        
        found_routes = []
        missing_routes = []
        
        for expected in expected_routes:
            # Check if route exists (might have different methods)
            found = any(expected in path for path in route_paths)
            if found:
                found_routes.append(expected)
                print(f"✓ {expected}")
            else:
                missing_routes.append(expected)
                print(f"✗ {expected} (not found)")
        
        print(f"\nTotal routes registered: {len(route_paths)}")
        print(f"Expected routes found: {len(found_routes)}/{len(expected_routes)}")
        
        return missing_routes
    except Exception as e:
        print(f"✗ Error checking routes: {e}")
        return []

def check_layer_separation():
    """Check that layers are properly separated."""
    print("\n" + "=" * 60)
    print("Checking Layer Separation...")
    print("=" * 60)
    
    issues = []
    
    # Check that routes don't import from data directly
    try:
        import routes.auth_routes as auth_routes_module
        import inspect
        source = inspect.getsource(auth_routes_module)
        if "from data import" in source or "import data" in source:
            issues.append("routes/auth_routes.py imports from data layer directly")
            print("✗ routes should not import from data layer")
        else:
            print("✓ Routes properly separated from data layer")
    except Exception as e:
        print(f"⚠ Could not check route separation: {e}")
    
    # Check that controllers don't import from data directly
    try:
        import controllers.auth_controller as auth_controller_module
        import inspect
        source = inspect.getsource(auth_controller_module)
        if "from data import" in source or "import data" in source:
            issues.append("controllers/auth_controller.py imports from data layer directly")
            print("✗ Controllers should not import from data layer")
        else:
            print("✓ Controllers properly separated from data layer")
    except Exception as e:
        print(f"⚠ Could not check controller separation: {e}")
    
    # Check that services use repositories
    try:
        import services.auth_service as auth_service_module
        import inspect
        source = inspect.getsource(auth_service_module)
        if "UserRepository" in source:
            print("✓ Services use repositories (data layer)")
        else:
            issues.append("Services might not be using repositories")
    except Exception as e:
        print(f"⚠ Could not check service layer: {e}")
    
    return issues

def main():
    """Run all checks."""
    print("\n" + "=" * 60)
    print("BACKEND STRUCTURE VERIFICATION")
    print("=" * 60 + "\n")
    
    all_errors = []
    
    # Run checks
    import_errors = check_imports()
    missing_dirs = check_structure()
    missing_files = check_files()
    missing_routes = check_routes()
    layer_issues = check_layer_separation()
    
    all_errors.extend(import_errors)
    all_errors.extend([f"Missing directory: {d}" for d in missing_dirs])
    all_errors.extend([f"Missing file: {f}" for f in missing_files])
    all_errors.extend([f"Missing route: {r}" for r in missing_routes])
    all_errors.extend(layer_issues)
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if not all_errors:
        print("\n✅ ALL CHECKS PASSED!")
        print("✓ Backend structure is properly organized")
        print("✓ All modules can be imported")
        print("✓ All required files exist")
        print("✓ Routes are properly registered")
        print("✓ Layers are properly separated")
    else:
        print(f"\n⚠️  FOUND {len(all_errors)} ISSUE(S):")
        for error in all_errors:
            print(f"  - {error}")
    
    return len(all_errors) == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
