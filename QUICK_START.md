# 🚀 Quick Start Guide - Run SoftScale Locally

## Fastest Way to Run (Docker)

### Step 1: Start Docker Desktop
**Docker Desktop must be running!**

1. Open **Docker Desktop** from Start Menu
2. Wait until you see the Docker icon in system tray
3. Wait for "Docker Desktop is running" message

### Step 2: Start Backend + Database
```powershell
docker-compose up --build -d
```

Wait for: "Container softscale-backend started" and "Container softscale-postgres started"

### Step 3: Create Database Tables
```powershell
Get-Content database\schema.sql | docker-compose exec -T postgres psql -U postgres -d talent_match_db
```

### Step 4: Start Frontend (NEW TERMINAL)
```powershell
cd frontend
npm install
npm start
```

Browser will open automatically to http://localhost:3000

## ✅ You're Done!

- **Backend**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000
- **Database**: Running in Docker

## 🛑 To Stop Everything

**Terminal 1 (Docker):**
```powershell
docker-compose down
```

**Terminal 2 (Frontend):**
- Press `Ctrl+C`

## 📋 Quick Command Reference

```powershell
# Start Docker services
docker-compose up --build -d

# Check Docker status
docker-compose ps

# View Docker logs
docker-compose logs -f

# Stop Docker services
docker-compose down

# Create database tables
Get-Content database\schema.sql | docker-compose exec -T postgres psql -U postgres -d talent_match_db

# Start frontend (from frontend directory)
npm start
```

## 🔧 Troubleshooting

### "Docker daemon not running"
→ Start Docker Desktop and wait for it to fully start

### "Port already in use"
→ Stop any services using ports 8000, 5432, or 3000

### "Cannot connect to backend"
→ Wait a few seconds for services to start
→ Check: `docker-compose ps`
→ Check logs: `docker-compose logs backend`

### "relation users does not exist"
→ Run: `Get-Content database\schema.sql | docker-compose exec -T postgres psql -U postgres -d talent_match_db`

## ✅ Success Checklist

- [ ] Docker Desktop is running
- [ ] Backend running on http://localhost:8000
- [ ] Database tables created
- [ ] Frontend running on http://localhost:3000
- [ ] Can access http://localhost:3000 in browser

## 🎯 Next Steps

1. Open http://localhost:3000
2. Click "Sign Up" to create an account
3. Select your role (Job Seeker, Freelancer, or Company)
4. Complete your profile
5. Start using the app!

## 📚 More Help

See `SETUP_GUIDE.md` for detailed instructions.

