# Docker Setup Guide for SoftScale

This guide will help you run the SoftScale backend and database using Docker.

## Prerequisites

- **Docker Desktop** installed and running
  - Download: https://www.docker.com/products/docker-desktop/
  - Make sure Docker Desktop is running before proceeding

## Quick Start

### 1. Start Everything

From the project root directory, run:

```powershell
docker-compose up --build -d
```

This will:
- Build the backend Docker image
- Start PostgreSQL database container
- Start the backend API container
- Set up networking between them

### 2. Create Database Tables

```powershell
Get-Content database\schema.sql | docker-compose exec -T postgres psql -U postgres -d talent_match_db
```

### 3. Verify Services are Running

**Backend API:**
- URL: http://localhost:8000
- API documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/

**Database:**
- Host: localhost (from your machine)
- Port: 5432
- Database: talent_match_db
- User: postgres
- Password: 4681

### 4. Check Container Status

```powershell
docker-compose ps
```

You should see both `softscale-postgres` and `softscale-backend` running.

## Common Commands

### Start Services
```powershell
docker-compose up
```

### Start in Background (Detached Mode)
```powershell
docker-compose up -d
```

### Stop Services
```powershell
docker-compose down
```

### Stop and Remove Volumes (⚠️ Deletes Database Data)
```powershell
docker-compose down -v
```

### View Logs
```powershell
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs postgres

# Follow logs (real-time)
docker-compose logs -f backend
```

### Rebuild After Code Changes
```powershell
docker-compose up --build
```

### Restart a Specific Service
```powershell
docker-compose restart backend
docker-compose restart postgres
```

## Development Workflow

### Hot Reload
The backend is configured with `--reload` flag, so code changes in `backend/` will automatically restart the server.

### Accessing the Database

**From your local machine:**
```powershell
# Using psql (if installed)
psql -h localhost -U postgres -d talent_match_db

# Using pgAdmin
# Connect to: localhost:5432
# Database: talent_match_db
# User: postgres
# Password: 4681
```

**From within Docker:**
```powershell
# Execute command in postgres container
docker-compose exec postgres psql -U postgres -d talent_match_db
```

## Project Structure

```
SoftScale/
├── docker-compose.yml      # Docker services configuration
├── backend/
│   ├── Dockerfile         # Backend container definition
│   ├── .dockerignore      # Files to exclude from build
│   ├── app.py            # Main application
│   └── requirements.txt   # Python dependencies
├── database/
│   └── schema.sql        # Database schema
└── DOCKER_SETUP.md        # This file
```

## Environment Variables

You can customize the setup by creating a `.env` file in the project root:

```env
POSTGRES_DB=talent_match_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=4681
DB_HOST=postgres
DB_PORT=5432
```

## Troubleshooting

### Port Already in Use

If port 5432 or 8000 is already in use:

**Option 1: Stop conflicting services**
```powershell
# Find what's using the port
netstat -ano | findstr :5432
netstat -ano | findstr :8000
```

**Option 2: Change ports in docker-compose.yml**
```yaml
services:
  postgres:
    ports:
      - "5433:5432"  # Changed from 5432:5432
  backend:
    ports:
      - "8001:8000"  # Changed from 8000:8000
```

### Database Connection Errors

1. **Check if containers are running:**
   ```powershell
   docker-compose ps
   ```

2. **Check logs:**
   ```powershell
   docker-compose logs postgres
   docker-compose logs backend
   ```

3. **Verify database is ready:**
   ```powershell
   docker-compose exec postgres pg_isready -U postgres
   ```

### Container Won't Start

1. **Check Docker Desktop is running**
2. **Rebuild containers:**
   ```powershell
   docker-compose down
   docker-compose up --build
   ```

3. **Check for errors in logs:**
   ```powershell
   docker-compose logs
   ```

### WSL Errors

If you get WSL timeout errors:
1. Open Docker Desktop Settings
2. Go to General
3. Uncheck "Use the WSL 2 based engine"
4. Apply & Restart

## Data Persistence

Database data is stored in a Docker volume named `postgres_data`. This means:
- ✅ Data persists even after stopping containers
- ✅ Data is removed only if you run `docker-compose down -v`

To backup data:
```powershell
docker-compose exec postgres pg_dump -U postgres talent_match_db > backup.sql
```

To restore data:
```powershell
docker-compose exec -T postgres psql -U postgres talent_match_db < backup.sql
```

## Running Frontend

The frontend still runs locally (not in Docker):

```powershell
cd frontend
npm start
```

The frontend will connect to the backend at `http://localhost:8000`.

## Production Considerations

For production, you should:
1. Use environment variables for sensitive data
2. Remove `--reload` flag from backend
3. Use proper secrets management
4. Set up proper backup strategy
5. Configure resource limits in docker-compose.yml
6. Use production-grade PostgreSQL configuration

## Next Steps

1. ✅ Start Docker containers: `docker-compose up -d`
2. ✅ Create database tables: Run schema.sql
3. ✅ Verify backend is running: http://localhost:8000/docs
4. ✅ Start frontend: `cd frontend && npm start`
5. ✅ Open application: http://localhost:3000

## Need Help?

- Check Docker Desktop is running
- Review logs: `docker-compose logs`
- Verify containers: `docker-compose ps`
- Check ports: `netstat -ano | findstr :8000`

Happy coding! 🐳



