# PKCE Flow Migration

## Overview
The authentication system has been updated to use **PKCE (Proof Key for Code Exchange)** flow for OAuth authentication, providing enhanced security against authorization code interception attacks.

## What Changed

### 1. OAuth Service (`src/services/oauth.service.ts`)
- **Added** `flowType: 'pkce'` option to `signInWithOAuth()` call
- **Updated** `redirectTo` URL from `/oauth/${provider}` to `/auth/callback`
- OAuth URL generation now uses PKCE flow automatically

### 2. OAuth Callback Schema (`src/schemas/auth.schemas.ts`)
**Before:**
```typescript
export const oauthCallbackSchema = z.object({
    access_token: z.string().min(1),
    refresh_token: z.string().min(1),
    provider_token: z.string().optional(),
    expires_in: z.string().optional(),
});
```

**After:**
```typescript
export const oauthCallbackSchema = z.object({
    code: z.string().min(1, "Authorization code is required"),
});
```

### 3. Type Definitions (`src/types/auth.types.ts`)
**Before:**
```typescript
export interface OAuthCallbackRequest {
    access_token: string;
    refresh_token: string;
    provider_token?: string;
    expires_in?: string;
}
```

**After:**
```typescript
export interface OAuthCallbackRequest {
    code: string;
}
```

### 4. Auth Controller (`src/controllers/auth.controller.ts`)
**Before:** Callback received tokens directly
```typescript
const { access_token, refresh_token } = request.body;
reply.setCookie("accessToken", access_token, {...});
```

**After:** Callback receives authorization code and exchanges it
```typescript
const { code } = request.body as OAuthCallbackRequest;
const result = await this.oauthService.handleCallback(provider, code);
reply.setCookie("accessToken", result.tokens.accessToken, {...});
```

### 5. Tests Updated
- OAuth tests now verify PKCE flow parameters
- Mock `exchangeCodeForSession` instead of direct token handling
- Updated test expectations for code-based callback

## How PKCE Flow Works

### Client-Side Flow:
1. **User clicks "Login with Google/Apple"**
   - Frontend calls `GET /oauth/google`
   - Backend returns authorization URL with PKCE challenge

2. **User redirects to OAuth provider**
   - Supabase automatically generates and stores code verifier
   - Code challenge is included in authorization URL

3. **OAuth provider authenticates user**
   - User grants permissions
   - Provider redirects back to `FRONTEND_URL/auth/callback?code=...`

4. **Frontend receives authorization code**
   - Extract code from URL parameters
   - Send code to backend: `POST /oauth/google/callback { code: "..." }`

5. **Backend exchanges code for session**
   - Backend calls `exchangeCodeForSession(code)`
   - Supabase validates code with stored verifier (PKCE)
   - Returns user session with tokens
   - Tokens stored in HTTP-only cookies

## Frontend Integration

### Step 1: Initiate OAuth
```typescript
// Get OAuth URL
const response = await fetch('/oauth/google', { method: 'GET' });
const { data } = await response.json();

// Redirect user to OAuth provider
window.location.href = data.url;
```

### Step 2: Handle Callback
```typescript
// In your callback route (e.g., /auth/callback)
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code) {
    // Exchange code for session
    const response = await fetch('/oauth/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        credentials: 'include', // Important: include cookies
    });
    
    const result = await response.json();
    if (result.success) {
        // Tokens are now in HTTP-only cookies
        // Redirect to dashboard or home
        window.location.href = '/dashboard';
    }
}
```

## Security Benefits

1. **Authorization Code Interception Protection**: Even if an attacker intercepts the authorization code, they cannot exchange it without the code verifier
2. **No Client Secret Required**: PKCE eliminates the need for client secrets in SPAs
3. **Dynamic Code Verifier**: Each authorization request uses a unique, cryptographically random code verifier
4. **Replay Attack Prevention**: Authorization codes can only be used once and are tied to the specific verifier

## Backward Compatibility

⚠️ **Breaking Change**: This migration requires frontend updates. Old implementations expecting direct tokens in the callback will fail.

### Migration Checklist:
- [ ] Update frontend OAuth callback handler to extract `code` parameter
- [ ] Update callback POST request to send `{ code: "..." }` instead of tokens
- [ ] Verify `redirectTo` URL in OAuth config matches frontend callback route
- [ ] Test OAuth flow end-to-end with all providers (Google, Apple)

## Environment Variables

No changes required to environment variables. Ensure you have:
```env
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
```

## Testing

Run tests to verify PKCE implementation:
```bash
pnpm run test
```

All OAuth-related tests have been updated to verify:
- PKCE flow type is included in OAuth URL generation
- Callback expects `code` parameter
- `exchangeCodeForSession` is called correctly
- Tokens are properly set in HTTP-only cookies

## References

- [Supabase Auth with PKCE](https://supabase.com/docs/guides/auth/server-side/pkce-flow)
- [OAuth 2.0 for Native Apps (RFC 8252)](https://datatracker.ietf.org/doc/html/rfc8252)
- [Proof Key for Code Exchange (RFC 7636)](https://datatracker.ietf.org/doc/html/rfc7636)
