# SoftScale Setup Guide

Complete guide for setting up and running SoftScale locally.

## Prerequisites

- **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 14+** and **npm** - [Download Node.js](https://nodejs.org/)
- **Docker Desktop** (for Docker setup) - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **PostgreSQL** (for manual setup) - [Download PostgreSQL](https://www.postgresql.org/download/)

## Option 1: Docker Setup (Recommended)

### Step 1: Start Docker Desktop
1. Open Docker Desktop from Start Menu
2. Wait until it shows "Docker Desktop is running"

### Step 2: Start Services
```powershell
docker-compose up --build -d
```

### Step 3: Create Database Tables
```powershell
Get-Content database\schema.sql | docker-compose exec -T postgres psql -U postgres -d talent_match_db
```

### Step 4: Start Frontend
```powershell
cd frontend
npm install
npm start
```

## Option 2: Manual Setup

### Step 1: Database Setup

1. **Install PostgreSQL**
   - Download from: https://www.postgresql.org/download/
   - During installation, set password to `4681` (or update app config)

2. **Create Database**
   ```sql
   CREATE DATABASE talent_match_db;
   ```

3. **Run Schema**
   - Open pgAdmin or psql
   - Connect to PostgreSQL
   - Run: `\i database/schema.sql`

4. **Update Credentials** (if password differs)
   - `backend/app.py` (lines 54-67)
   - `backend/talent.py` (lines 14-20)

### Step 2: Backend Setup

1. **Navigate to backend:**
   ```powershell
   cd backend
   ```

2. **Create virtual environment:**
   ```powershell
   python -m venv venv
   venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

4. **Start backend:**
   ```powershell
   python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
   ```

### Step 3: Frontend Setup

1. **Navigate to frontend:**
   ```powershell
   cd frontend
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Start frontend:**
   ```powershell
   npm start
   ```

## Verification

### Check Backend
- Open: http://127.0.0.1:8000/docs
- Should show FastAPI documentation

### Check Frontend
- Open: http://localhost:3000
- Should show the application

### Check Database
```powershell
# Docker
docker-compose exec -T postgres psql -U postgres -d talent_match_db -c "\dt"

# Manual
psql -U postgres -d talent_match_db -c "\dt"
```

## Troubleshooting

### Docker Issues

**"Docker daemon not running"**
→ Start Docker Desktop and wait for it to fully start

**"Port already in use"**
→ Stop conflicting services or change ports in docker-compose.yml

**"WSL timeout error"**
→ Disable WSL in Docker Desktop Settings → General → Uncheck "Use WSL 2 based engine"

### Database Issues

**"relation does not exist"**
→ Run the schema: `Get-Content database\schema.sql | docker-compose exec -T postgres psql -U postgres -d talent_match_db`

**"Connection refused"**
→ Check PostgreSQL is running (Docker or local service)

### Frontend Issues

**"Module not found: axios"**
→ Run: `cd frontend && npm install axios`

**"Cannot connect to backend"**
→ Verify backend is running at http://127.0.0.1:8000

## Common Commands

### Docker
```powershell
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Status
docker-compose ps

# Rebuild
docker-compose up --build -d
```

### Manual
```powershell
# Backend
cd backend
python -m uvicorn app:app --reload

# Frontend
cd frontend
npm start
```

## Next Steps

1. ✅ Start all services
2. ✅ Verify database tables exist
3. ✅ Sign up for an account
4. ✅ Select your role
5. ✅ Complete your profile
6. ✅ Start using the app!

## Need More Help?

- See `DOCKER_SETUP.md` for Docker-specific help
- See `QUICK_START.md` for quick reference
- Check backend logs: `docker-compose logs backend`
- Check frontend console (F12 in browser)

