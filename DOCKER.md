# Docker Setup Guide

This document explains how to run the auth-backend service using Docker and Docker Compose.

## Prerequisites

- Docker installed (v20.10 or higher)
- Docker Compose installed (v2.0 or higher)
- A `.env` file with required environment variables (see `.env.example`)

## Quick Start

### 1. Setup Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` and add your actual configuration values.

### 2. Production Build

Run the application in production mode:

```bash
# Using docker-compose
docker-compose up -d

# Or using pnpm scripts
pnpm run docker:up
```

The service will be available at `http://localhost:8080`

### 3. Development Mode

For development with hot-reload:

```bash
# Using docker-compose
docker-compose -f docker-compose.dev.yml up

# Or using pnpm scripts
pnpm run docker:up:dev
```

## Available Commands

### Building Images

```bash
# Build production image
pnpm run docker:build
# or
docker build -t auth-backend:latest .

# Build development image
pnpm run docker:build:dev
# or
docker build -f Dockerfile.dev -t auth-backend:dev .
```

### Starting Services

```bash
# Start production services (detached)
pnpm run docker:up

# Start development services (with logs)
pnpm run docker:up:dev
```

### Stopping Services

```bash
# Stop production services
pnpm run docker:down

# Stop development services
pnpm run docker:down:dev
```

### Viewing Logs

```bash
# View production logs
pnpm run docker:logs

# View development logs
pnpm run docker:logs:dev

# Or directly with docker-compose
docker-compose logs -f auth-backend
```

## Docker Compose Files

### `docker-compose.yml` (Production)

- Builds from `Dockerfile`
- Runs the compiled application (`node dist/server.js`)
- Includes health checks
- Suitable for production deployments

### `docker-compose.dev.yml` (Development)

- Builds from `Dockerfile.dev`
- Mounts source code for hot-reload
- Runs with `tsx watch` for automatic restarts
- Suitable for local development

## Environment Variables

Required environment variables (see `.env.example` for full list):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `JWT_SECRET` - Secret for JWT signing (min 32 characters)
- `FRONTEND_URL` - URL of your frontend application
- `ENVIRONMENT` - Environment name (development/staging/production)

Optional OAuth variables:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`

## Health Check

The production container includes a health check that runs every 30 seconds:

```bash
# Check container health status
docker inspect --format='{{.State.Health.Status}}' auth-backend
```

## Troubleshooting

### Container won't start

1. Check logs: `docker-compose logs auth-backend`
2. Verify environment variables are set correctly
3. Ensure ports are not already in use: `lsof -i :8080`

### Permission Issues

If you encounter permission issues with volumes in development mode:

```bash
# Fix node_modules permissions
docker-compose -f docker-compose.dev.yml down
docker volume rm auth-backend_node_modules
docker-compose -f docker-compose.dev.yml up --build
```

### Rebuilding After Changes

```bash
# Rebuild and restart
docker-compose up -d --build

# Or for development
docker-compose -f docker-compose.dev.yml up --build
```

## Network Configuration

Both compose files create a bridge network called `auth-network`. To connect other services:

```yaml
services:
  your-service:
    networks:
      - auth-network

networks:
  auth-network:
    external: true
```

## Production Deployment

For production deployments (Cloud Run, ECS, etc.):

1. Build the image: `docker build -t auth-backend:latest .`
2. Tag for your registry: `docker tag auth-backend:latest gcr.io/your-project/auth-backend:latest`
3. Push to registry: `docker push gcr.io/your-project/auth-backend:latest`
4. Deploy using your platform's tools

## Performance Tips

- The multi-stage build in `Dockerfile` is optimized for caching
- `pnpm-lock.yaml` is copied first to cache dependency installation
- Development mode uses volumes for instant code updates
- Production mode includes only necessary files (see `.dockerignore`)
