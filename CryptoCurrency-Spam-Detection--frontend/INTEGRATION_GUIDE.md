# Frontend-Backend Integration Guide

## Overview
This guide explains how to run the Next.js frontend, NestJS backend, and Python blockchain engine together for the Crypto Intelligence platform.

## Prerequisites
- Node.js (v18 or higher)
- Docker and Docker Compose
- PostgreSQL and Redis containers

## Setup Instructions

### 1. Blockchain Engine Setup

```bash
cd Blockchain
pip install -e .
python -m blockchain_engine.scripts.run_api_server --host 127.0.0.1 --port 8055
```

The engine will start on `http://127.0.0.1:8055`.

### 2. Backend Setup

#### Create Environment File
Create `.env` file in the `backend` directory:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=crypto_intelligence
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
BLOCKCHAIN_API_URL=http://127.0.0.1:8055
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
API_KEY=your-api-key-here
API_SECRET=your-api-secret-here
```

#### Start Database Containers
```bash
cd backend
docker-compose up -d postgres redis
```

#### Start Backend Server
```bash
cd backend
npm run start:dev
```

The backend will start on `http://localhost:3000`

### 3. Frontend Setup

#### Environment Configuration
The frontend `.env` file should be:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_ALERTS_WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_NETWORK=ethereum
```

#### Start Frontend Server
```bash
cd CryptoCurrency-Spam-Detection--frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

## Integration Features

### CORS Configuration
The backend is configured to accept requests from the frontend:
- Origin: `http://localhost:5173`
- Credentials: enabled
- Methods: GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS

### API Proxy Configuration
Next.js is configured to proxy API requests to the backend:
- `/api/*` → `http://localhost:3000`
- `/ws/*` → `ws://localhost:3000`

### WebSocket Integration
The frontend connects to the backend WebSocket for real-time alerts.

## API Endpoints

The frontend expects the following backend endpoints:

### Address Management
- `GET /api/v1/address/:address/summary` - Get address summary
- `GET /api/v1/address/:address/transactions` - Get address transactions
- `GET /api/v1/address/:address/risk` - Get address risk score
- `GET /api/v1/address/:address/neighbors` - Get address neighbors

### Batch Operations
- `POST /api/v1/batch/check` - Batch address analysis
- `POST /api/v1/batch/csv` - CSV file analysis

### Watchlist
- `GET /api/v1/watchlist` - Get watchlist
- `POST /api/v1/watchlist` - Add to watchlist
- `DELETE /api/v1/watchlist/:id` - Remove from watchlist

### Alerts
- `GET /api/v1/alerts` - Get alerts
- `POST /api/v1/alerts/settings` - Update alert settings
- `WebSocket /ws` - Real-time alerts

## Development Workflow

1. **Start Blockchain Engine**: Run the Python blockchain API first
2. **Start Backend**: Run the NestJS backend
3. **Start Frontend**: Run the Next.js frontend
3. **Access Application**: Open `http://localhost:5173` in browser
4. **API Documentation**: Access `http://localhost:3000/api/docs` for Swagger docs

## Troubleshooting

### CORS Issues
If you encounter CORS errors, ensure:
1. Backend is running before frontend
2. Frontend URL matches CORS configuration
3. Environment variables are correctly set

### Database Connection Issues
1. Ensure PostgreSQL and Redis containers are running
2. Check database credentials in `.env` file
3. Verify Docker containers are healthy

### WebSocket Connection Issues
1. Ensure backend WebSocket endpoint is accessible
2. Check firewall settings
3. Verify WebSocket URL in frontend environment

## Production Considerations

For production deployment:
1. Use HTTPS for both frontend and backend
2. Update CORS origins to production domain
3. Configure proper environment variables
4. Set up proper authentication and authorization
5. Configure reverse proxy (nginx) for frontend serving
