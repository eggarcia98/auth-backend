# Authentication Backend - Getting Started

## Setup

1. Install dependencies:
   npm install

2. Configure environment variables:
   - Copy .env.example to .env
   - Fill in your Supabase credentials
   - Configure OAuth provider credentials (optional)

3. Set Cloudflare Workers secrets:
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_ANON_KEY
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   wrangler secret put JWT_SECRET

## Development

Run locally:
npm run dev

## Deployment

Deploy to Cloudflare Workers:
npm run deploy

## API Endpoints

### Authentication
- POST /api/v1/auth/signup - Register new user
- POST /api/v1/auth/login - Login with email/password
- POST /api/v1/auth/login/otp - Request OTP via email
- POST /api/v1/auth/verify-otp - Verify OTP code
- POST /api/v1/auth/refresh - Refresh access token
- POST /api/v1/auth/logout - Logout (requires auth)
- POST /api/v1/auth/forgot-password - Request password reset
- POST /api/v1/auth/reset-password - Reset password (requires auth)

### OAuth
- GET /api/v1/auth/oauth/:provider - Get OAuth authorization URL
- POST /api/v1/auth/oauth/:provider/callback - Handle OAuth callback

### User
- GET /api/v1/auth/me - Get current user (requires auth)

## Example Requests

### Signup
curl -X POST http://localhost:8787/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'

### Login
curl -X POST http://localhost:8787/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'

### Get Current User
curl http://localhost:8787/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"