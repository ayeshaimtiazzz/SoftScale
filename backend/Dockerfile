# ----------------------
# Stage 1: Builder
# ----------------------
FROM python:3.12 as builder

WORKDIR /app

# Install build tools needed for ML packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    gcc \
    libopenblas-dev \
    libomp-dev \
    libpq-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy requirements and install in a separate layer
COPY requirements.txt .

# Install all Python dependencies into /install
RUN pip install --upgrade pip && \
    pip install --prefix=/install --no-cache-dir -r requirements.txt

# ----------------------
# Stage 2: Final image
# ----------------------
FROM python:3.12-slim

WORKDIR /app

# Copy only the installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Ensure embeddings directory exists
RUN mkdir -p embeddings

# Expose FastAPI port
EXPOSE 8000

# Run FastAPI app
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
