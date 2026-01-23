# Auth Backend

A production-ready authentication backend built with Fastify, Supabase, and TypeScript. Features secure email/password authentication, OAuth integration, OTP login, and comprehensive test coverage.

## Features

- 🔐 **Email/Password Authentication** - Secure user registration and login
- 🔑 **JWT Token Management** - Access and refresh token handling with HTTP-only cookies
- 📧 **OTP Authentication** - Passwordless login via email
- 🌐 **OAuth Integration** - Support for Google and Apple Sign-In
- 🔒 **Password Reset** - Secure password recovery flow
- ✅ **Input Validation** - Zod schema validation for all endpoints
- 🛡️ **Error Handling** - Comprehensive error middleware with proper status codes
- 📝 **Type Safety** - Full TypeScript implementation
- ✨ **Modern Stack** - Fastify, Supabase, Zod
- 🧪 **Test Coverage** - Comprehensive test suite with Vitest
- 🐳 **Docker Support** - Production-ready containerization
- ☁️ **Cloudflare Workers** - Optional serverless deployment

## Tech Stack

- **Framework:** Fastify 5.0
- **Database/Auth:** Supabase
- **Validation:** Zod
- **Language:** TypeScript
- **Testing:** Vitest
- **Package Manager:** pnpm
- **Logging:** Pino

## Prerequisites

- Node.js 18+ or Bun
- pnpm (recommended) or npm
- Supabase account and project
- (Optional) Docker for containerized deployment

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Setup

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Configure your environment variables:

```env
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key
```

### 3. Run Development Server

```bash
pnpm dev
```

The server will start at `http://localhost:3000`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build TypeScript to JavaScript |
| `pnpm start` | Start production server |
| `pnpm test` | Run tests in watch mode |
| `pnpm test --run` | Run tests once |
| `pnpm test --coverage` | Run tests with coverage report |
| `pnpm type-check` | Check TypeScript types |

## API Documentation

### Base URL

```
Development: http://localhost:3000/api/v1/auth
Production: https://your-domain.com/api/v1/auth
```

### Authentication Endpoints

#### Sign Up

Register a new user account.

```http
POST /signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "emailVerified": false,
      "provider": "email",
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z"
    },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "jwt-refresh-token",
      "expiresIn": 3600
    }
  }
}
```

#### Login

Authenticate with email and password.

```http
POST /login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
- Sets `accessToken` and `refreshToken` as HTTP-only cookies
- Returns success message

```json
{
  "success": true,
  "message": "Login successful, tokens set in cookies"
}
```

**Error Response:** `401 Unauthorized`
```json
{
  "success": false,
  "error": {
    "message": "Invalid email or password",
    "code": "UNAUTHORIZED"
  }
}
```

#### Refresh Token

Get new access token using refresh token from cookies.

```http
POST /refresh
Cookie: refreshToken=your-refresh-token
```

**Response:** `200 OK`
- Updates both `accessToken` and `refreshToken` cookies

```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "tokens": {
      "accessToken": "new-jwt-token",
      "refreshToken": "new-refresh-token",
      "expiresIn": 3600
    }
  }
}
```

#### OTP Login

Request a one-time password via email.

```http
POST /login/otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "OTP sent to email"
  }
}
```

#### Verify OTP

Verify the OTP code sent to email.

```http
POST /verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "token": "123456"
}
```

#### Logout

Logout the current user (requires authentication).

```http
POST /logout
Authorization: Bearer your-access-token
```

**Response:** `200 OK`
- Clears authentication cookies

#### Forgot Password

Request a password reset link.

```http
POST /forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password

Reset password with token from email (requires authentication).

```http
POST /reset-password
Authorization: Bearer reset-token
Content-Type: application/json

{
  "password": "NewSecurePass123"
}
```

### OAuth Endpoints

#### Get OAuth URL

Get the authorization URL for OAuth provider.

```http
GET /oauth/:provider
```

Supported providers: `google`, `apple`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}
```

#### OAuth Callback

Handle OAuth provider callback.

```http
POST /oauth/:provider/callback
Content-Type: application/json

{
  "code": "authorization-code",
  "state": "optional-state"
}
```

### User Endpoints

#### Get Current User

Get authenticated user information (requires authentication).

```http
GET /me
Authorization: Bearer your-access-token
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "emailVerified": true,
    "provider": "email",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z"
  }
}
```

## Testing

The project includes comprehensive test coverage for authentication flows.

```bash
# Run all tests
pnpm test --run

# Run tests in watch mode
pnpm test

# Generate coverage report
pnpm test --coverage
```

**Test Coverage:**
- ✅ Login route (8 tests)
- ✅ Refresh token route (7 tests)
- ✅ Integration tests (1 test)

See [tests/README.md](tests/README.md) for detailed testing documentation.

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t auth-backend .

# Run container
docker run -p 3000:3000 --env-file .env auth-backend
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": [] // Optional validation errors
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` (400) - Invalid input data
- `UNAUTHORIZED` (401) - Authentication required or invalid credentials
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource already exists
- `INTERNAL_ERROR` (500) - Server error

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.
