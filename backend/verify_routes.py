"""Verify that proposal routes are properly registered."""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    print("=" * 60)
    print("VERIFYING PROPOSAL ROUTES")
    print("=" * 60)

    # Test imports
    print("\n1. Testing imports...")
    try:
        from routes.proposal_routes import router as proposal_router
        print("   ✅ proposal_router imported successfully")
    except Exception as e:
        print(f"   ❌ Failed to import proposal_router: {e}")
        sys.exit(1)

    try:
        from controllers.proposal_controller import ProposalController
        print("   ✅ ProposalController imported successfully")
    except Exception as e:
        print(f"   ❌ Failed to import ProposalController: {e}")
        sys.exit(1)

    # Check router prefix
    print(f"\n2. Router prefix: {proposal_router.prefix}")

    # List all routes
    print("\n3. Registered routes:")
    routes_found = []
    for route in proposal_router.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            methods = [m for m in route.methods if m not in ['HEAD', 'OPTIONS']]
            if methods:
                full_path = f"{proposal_router.prefix}{route.path}"
                routes_found.append({
                    'path': full_path,
                    'methods': methods
                })
                print(f"   {', '.join(methods):8} {full_path}")

    # Check for specific routes
    print("\n4. Checking for specific routes:")
    target_routes = [
        "/api/proposals/generate-from-deal",
        "/api/proposals/generate-from-match"
    ]

    all_paths = [r['path'] for r in routes_found]
    for target in target_routes:
        if target in all_paths:
            print(f"   ✅ {target} - FOUND")
        else:
            print(f"   ❌ {target} - NOT FOUND")
            # Check if it exists with different case or similar
            similar = [p for p in all_paths if 'generate' in p.lower() and ('deal' in p.lower() or 'match' in p.lower())]
            if similar:
                print(f"      Similar routes found: {similar}")

    # Test app registration
    print("\n5. Testing app registration...")
    try:
        from app import app
        print("   ✅ App imported successfully")

        # Check if proposal_router is in app routes
        app_routes = []
        for route in app.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                methods = [m for m in route.methods if m not in ['HEAD', 'OPTIONS']]
                if methods and 'proposal' in route.path.lower():
                    app_routes.append(route.path)

        if app_routes:
            print(f"   ✅ Found {len(app_routes)} proposal routes in app")
            for route in app_routes[:5]:  # Show first 5
                print(f"      - {route}")
        else:
            print("   ⚠️  No proposal routes found in app (might be normal if routes are nested)")

    except Exception as e:
        print(f"   ⚠️  Could not import app: {e}")
        print("      (This is OK if running outside of app context)")

    print("\n" + "=" * 60)
    print("VERIFICATION COMPLETE")
    print("=" * 60)

except Exception as e:
    print(f"\n❌ Error during verification: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

