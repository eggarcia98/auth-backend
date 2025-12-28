# Cloud Run Dockerfile for auth-backend
FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

# Copy manifest files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build TypeScript
RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run listens on $PORT; Fastify binds to 0.0.0.0
CMD ["node", "dist/server.js"]
