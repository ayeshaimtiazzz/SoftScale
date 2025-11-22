# SoftScale

SoftScale helps companies connect with skilled individuals and generate personalized proposals, while also assisting with sentiment analysis, price prediction, and client management through CRM.

## Prerequisites

Before running the application, ensure you have the following installed:

- **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 14+** and **npm** - [Download Node.js](https://nodejs.org/)
- **Docker Desktop** - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Git** (optional, for cloning)

## Quick Start with Docker (Recommended)

### 1. Start Docker Desktop
Make sure Docker Desktop is running.

### 2. Start Backend + Database
```powershell
docker-compose up --build -d
```

### 3. Create Database Tables
```powershell
Get-Content database\schema.sql | docker-compose exec -T postgres psql -U postgres -d talent_match_db
```

### 4. Start Frontend
```powershell
cd frontend
npm install
npm start
```

## Manual Setup (Without Docker)

### 1. Database Setup

1. Install and start PostgreSQL
2. Create a database named `talent_match_db`:
   ```sql
   CREATE DATABASE talent_match_db;
   ```
3. Run the schema:
   ```sql
   \i database/schema.sql
   ```
4. Update database credentials in `backend/app.py` and `backend/talent.py` if needed

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Using Docker (Recommended)

**Start Backend + Database:**
```powershell
docker-compose up -d
```

**Start Frontend:**
```powershell
cd frontend
npm start
```

### Manual Run

**Backend:**
```powershell
cd backend
python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

**Frontend:**
```powershell
cd frontend
npm start
```

## Application URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://127.0.0.1:8000
- **API Documentation**: http://127.0.0.1:8000/docs

## First Time Usage

1. **Sign Up** - Go to http://localhost:3000/signup
2. **Create Account** - Use any email and password
3. **Select Role** - Choose Job Seeker, Freelancer, or Company Admin
4. **Complete Profile** - Fill in your profile information
5. **Login** - Use your email and password to login

## Docker Commands

```powershell
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Rebuild after changes
docker-compose up --build -d
```

## Troubleshooting

See `SETUP_GUIDE.md` for detailed troubleshooting steps.

## Project Structure

```
SoftScale/
├── backend/              # FastAPI backend
│   ├── app.py           # Main application
│   ├── talent.py        # Talent matching logic
│   ├── Dockerfile       # Backend container definition
│   └── requirements.txt
├── frontend/            # React frontend
│   ├── src/
│   └── package.json
├── database/            # Database schema
│   └── schema.sql
├── docker-compose.yml   # Docker services configuration
└── README.md
```

## Need Help?

Check the documentation files:
- `SETUP_GUIDE.md` - Detailed setup instructions
- `DOCKER_SETUP.md` - Docker-specific setup
- `QUICK_START.md` - Quick reference guide
