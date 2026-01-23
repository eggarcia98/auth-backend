# Auth Backend Tests

This directory contains tests for the authentication backend API.

## Test Structure

- **tests/setup.ts** - Global test setup with environment configuration
- **tests/helpers.ts** - Test utilities including mock Supabase client and helper functions
- **tests/auth.routes.test.ts** - Comprehensive tests for login and refresh routes

## Running Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test --run

# Run tests with coverage
pnpm test --coverage
```

## Test Coverage

### Login Route (`POST /login`)

The following scenarios are tested:

✅ **Success Cases:**
- Successfully login with valid credentials
- Cookies are set correctly (httpOnly, secure, sameSite)
- Tokens are returned in response
- Secure cookies are set in production environment

✅ **Error Cases:**
- Invalid credentials (wrong password)
- Invalid email format
- Password shorter than 8 characters
- Missing email field
- Missing password field
- Database/Supabase connection errors

### Refresh Route (`POST /refresh`)

The following scenarios are tested:

✅ **Success Cases:**
- Successfully refresh tokens with valid refresh token
- New cookies are set with updated tokens
- Cookie flags are properly configured (httpOnly, sameSite)
- Both access and refresh tokens are updated

✅ **Error Cases:**
- Missing refresh token
- Invalid refresh token
- Expired refresh token
- Service errors during refresh

### Integration Tests

✅ **Login and Refresh Flow:**
- Complete authentication flow testing login followed by token refresh

## Test Utilities

### Mock Supabase Client

The `createMockSupabaseClient()` helper creates a mocked Supabase client that can be configured for different test scenarios:

```typescript
const mockSupabase = createMockSupabaseClient();

// Mock successful login
mockSupabase.auth.signInWithPassword.mockResolvedValue(
    createMockAuthResponse()
);

// Mock failed login
mockSupabase.auth.signInWithPassword.mockResolvedValue({
    data: { user: null, session: null },
    error: { message: "Invalid credentials" }
});
```

### Helper Functions

- `createMockUser(overrides?)` - Creates mock user data
- `createMockSession(overrides?)` - Creates mock session data
- `createMockAuthResponse(overrides?)` - Creates complete auth response
- `createTestServer()` - Creates a Fastify test server with proper configuration

## Writing New Tests

To add new tests:

1. Import the necessary helpers from `./helpers.js`
2. Use `beforeEach` to set up fresh mocks for each test
3. Use Fastify's `inject` method to make HTTP requests
4. Assert on response status codes, body structure, and cookies

Example:

```typescript
it("should test something", async () => {
    // Setup mock response
    mockSupabase.auth.someMethod.mockResolvedValue(mockData);

    // Make request
    const response = await fastify.inject({
        method: "POST",
        url: "/some-route",
        payload: { /* data */ },
        cookies: { /* cookies */ }
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
});
```

## Configuration

Test configuration is in `vitest.config.ts`:

- Tests run in Node environment
- Setup file is automatically loaded before tests
- Coverage reports are generated in text, JSON, and HTML formats

## Notes

- All tests use mocked Supabase clients - no real API calls are made
- Cookies are tested to ensure proper security flags (httpOnly, secure, sameSite)
- Error handling is thoroughly tested for both validation and runtime errors
- Tests verify both success and failure paths
