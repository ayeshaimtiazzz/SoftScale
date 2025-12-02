# Profile Data Flow Documentation

## Overview
This document explains how profile data is fetched and displayed in the application, covering both the user's own profile and viewing other profiles (jobs, projects, candidates, companies).

## Routes

### 1. `/profile` - User's Own Profile
- **Purpose**: Displays the logged-in user's own profile based on their role
- **Navigation**: Clicking "Profile" in the top menu avatar dropdown
- **Data Source**: Fetches profile ID from backend based on user role, then fetches full profile

### 2. `/talent-details` - Talent & Leads Details
- **Purpose**: Displays profiles of talent matches and leads (jobs, projects, candidates, companies, freelancers)
- **Navigation**: Clicking "More Details" or "View Profile" from talent matches, lead discovery, or dashboard
- **Data Source**: Uses `item.id` and `item.type` passed via navigation state

## Data Flow

### Step 1: Talent Match API Response
When `/talent-match` endpoint is called, it returns matches with the following structure:

**For Candidates/Freelancers:**
```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "skills": "Python, React",
  "experience": "Senior",
  "experience_level": "Senior",
  "location": "USA, New York",
  "country": "USA",
  "city": "New York",
  "domain": "Software Development",
  "match_score": 0.95,
  "type": "candidate" // or "freelancer"
}
```

**For Jobs/Projects:**
```json
{
  "id": 456,
  "title": "Senior Software Engineer",
  "domain": "Software Development",
  "preferred_domain": "Software Development",
  "required_experience": "Senior",
  "experience_level": "Senior",
  "work_mode": "Remote",
  "workModel": "Remote",
  "country": "USA",
  "city": "New York",
  "company_name": "Tech Corp",
  "match_score": 0.92,
  "type": "job" // or "project"
}
```

### Step 2: Navigation to Talent Details
When user clicks "More Details" or "View Profile":
```javascript
navigate("/talent-details", { 
  state: { 
    item: matchItem,  // Contains id, type, and other fields
    role: currentUserRole 
  } 
});
```

### Step 3: Profile Component Processing

The `Profile` component (`frontend/src/pages/profile/index.js`) determines:

1. **Profile ID**: Uses `item.id` if provided, otherwise fetches user's profile ID
2. **Profile Type**: Determines from `item.type` or infers from item structure:
   - `item.type` explicitly set → use it
   - Fallback logic based on role and item structure:
     - Companies viewing → `candidate` (default)
     - Freelancers viewing → `project` if has `title`, else `job`
     - Job seekers viewing → `job`

### Step 4: API Call to Fetch Full Profile

```javascript
GET /api/profile/{profileId}?type={profileType}
```

**Backend Endpoint** (`backend/app.py`):
- Maps `type` to database table:
  - `candidate` → `job_seeker` table
  - `freelancer` → `freelancer` table
  - `company` → `company` table
  - `job` → `job` table
  - `project` → `projects` table

**Response Structure:**
```json
{
  "type": "candidate",
  "data": {
    "full_name": "John Doe",
    "email": "john@example.com",
    "skills": "Python, React",
    "experience_level": "Senior",
    "country": "USA",
    "city": "New York",
    "domain": "Software Development",
    // ... all other profile fields
  }
}
```

### Step 5: Profile Display

The Profile component renders the data with:
- Profile header with name/title and subtitle
- Organized sections based on profile type
- Color-coded fields based on profile type
- Company information (for jobs/projects)

## Backend Changes Made

### Updated `perform_talent_match` function:
1. Added `type` field to all match results
2. Added additional fields for consistency (`experience_level`, `country`, `city`, `workModel`, etc.)
3. Maps database table names to frontend types:
   - `job_seeker` → `candidate`
   - `freelancer` → `freelancer`
   - `job` → `job`
   - `projects` → `project`

## Frontend Changes Made

### Profile Component (`frontend/src/pages/profile/index.js`):
1. Enhanced type detection logic with fallbacks
2. Added debug logging for troubleshooting
3. Improved error handling

### TalentDetails Component (`frontend/src/pages/talent-details/index.js`):
1. Wrapper component that ensures item is provided
2. Redirects to `/profile` if no item (for own profile)

### Navigation Updates:
1. Header menu → navigates to `/profile` (own profile)
2. Talent match results → navigates to `/talent-details` with item
3. Dashboard top jobs/projects → navigates to `/talent-details` with item

## Debugging

Console logs added for debugging:
- Profile fetch parameters (item, id, type, role)
- API URL being called
- Profile data received
- Errors encountered

Check browser console for these logs when troubleshooting profile loading issues.

## Error Handling

The system handles:
- Missing profile ID → Shows error message
- Invalid type → Falls back to role-based inference
- API errors → Shows user-friendly error messages
- Network errors → Shows connection error message
- Missing item → Redirects to own profile page

## Testing Checklist

1. ✅ Click avatar menu → "Profile" → Should show own profile
2. ✅ View talent matches → Click "View Profile" → Should show candidate/freelancer profile
3. ✅ View jobs/projects → Click "More Details" → Should show job/project profile
4. ✅ Dashboard → Click "More Details" on job/project → Should show profile details
5. ✅ Verify profile type is correctly determined
6. ✅ Verify all profile fields are displayed correctly


