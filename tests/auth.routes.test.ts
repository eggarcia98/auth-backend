import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { AuthController } from "../src/controllers/auth.controller.js";
import { AuthService } from "../src/services/auth.service.js";
import { OAuthService } from "../src/services/oauth.service.js";
import { authRoutes } from "../src/routes/auth.routes.js";
import {
    createTestServer,
    createMockSupabaseClient,
    createMockAuthResponse,
    createMockUser,
    createMockSession,
} from "./helpers.js";

describe("Auth Routes - Login and Refresh", () => {
    let fastify: FastifyInstance;
    let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
    let mockAdminSupabase: ReturnType<typeof createMockSupabaseClient>;
    let authService: AuthService;
    let authController: AuthController;
    let oauthService: OAuthService;
    const mockEnv = {
        SUPABASE_URL: "http://localhost:54321",
        SUPABASE_ANON_KEY: "anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "service-key",
        JWT_SECRET: "a".repeat(32),
        APPLE_CLIENT_ID: "apple-client-id",
        APPLE_TEAM_ID: "apple-team-id",
        APPLE_KEY_ID: "apple-key-id",
        APPLE_PRIVATE_KEY: "apple-private-key",
        FRONTEND_URL: "http://localhost:3000",
        ENVIRONMENT: "development",
    };

    beforeEach(async () => {
        // Reset all mocks
        vi.clearAllMocks();

        // Create mock Supabase clients
        mockSupabase = createMockSupabaseClient();
        mockAdminSupabase = createMockSupabaseClient();

        // Create services
        authService = new AuthService(
            mockSupabase as any,
            mockAdminSupabase as any
        );
        oauthService = new OAuthService(mockSupabase as any, mockEnv as any);
        authController = new AuthController(authService, oauthService);

        // Create test server
        fastify = await createTestServer();

        // Register auth routes
        await authRoutes(fastify, authController, authService);
    });

    describe("POST /login", () => {
        it("should successfully login with valid credentials", async () => {
            const mockAuthData = createMockAuthResponse();
            mockSupabase.auth.signInWithPassword.mockResolvedValue(
                mockAuthData
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/login",
                payload: {
                    email: "test@example.com",
                    password: "ValidPass123",
                },
            });

            expect(response.statusCode).toBe(200);
            expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: "test@example.com",
                password: "ValidPass123",
            });

            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.message).toBe("Login successful, tokens set in cookies");

            // Check cookies were set
            const cookies = response.cookies;
            expect(cookies).toHaveLength(2);
            
            const accessTokenCookie = cookies.find((c) => c.name === "accessToken");
            const refreshTokenCookie = cookies.find((c) => c.name === "refreshToken");
            
            expect(accessTokenCookie).toBeDefined();
            expect(accessTokenCookie?.value).toBe("mock-access-token-123");
            expect(refreshTokenCookie).toBeDefined();
            expect(refreshTokenCookie?.value).toBe("mock-refresh-token-456");
        });

        it("should return 401 for invalid credentials", async () => {
            mockSupabase.auth.signInWithPassword.mockResolvedValue({
                data: { user: null, session: null },
                error: { message: "Invalid login credentials" },
            });

            const response = await fastify.inject({
                method: "POST",
                url: "/login",
                payload: {
                    email: "test@example.com",
                    password: "WrongPassword123",
                },
            });

            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error.message).toContain("Invalid email or password");
        });

        it("should return 400 for invalid email format", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/login",
                payload: {
                    email: "invalid-email",
                    password: "ValidPass123",
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            // Check in the details array for validation errors
            const errorMessage = JSON.stringify(body.error.details);
            expect(errorMessage).toContain("Invalid email");
        });

        it("should return 400 for password shorter than 8 characters", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/login",
                payload: {
                    email: "test@example.com",
                    password: "Short1",
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            // Check in the details array for validation errors
            const errorMessage = JSON.stringify(body.error.details);
            expect(errorMessage).toContain("at least 8 characters");
        });

        it("should return 400 when email is missing", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/login",
                payload: {
                    password: "ValidPass123",
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error).toBeDefined();
        });

        it("should return 400 when password is missing", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/login",
                payload: {
                    email: "test@example.com",
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error).toBeDefined();
        });

        it("should handle Supabase errors gracefully", async () => {
            mockSupabase.auth.signInWithPassword.mockRejectedValue(
                new Error("Database connection failed")
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/login",
                payload: {
                    email: "test@example.com",
                    password: "ValidPass123",
                },
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error).toBeDefined();
        });

        it("should set secure cookies in production environment", async () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = "production";

            const mockAuthData = createMockAuthResponse();
            mockSupabase.auth.signInWithPassword.mockResolvedValue(
                mockAuthData
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/login",
                payload: {
                    email: "test@example.com",
                    password: "ValidPass123",
                },
            });

            expect(response.statusCode).toBe(200);
            
            const accessTokenCookie = response.cookies.find(
                (c) => c.name === "accessToken"
            );
            expect(accessTokenCookie?.secure).toBe(true);

            // Restore environment
            process.env.NODE_ENV = originalEnv;
        });
    });

    describe("POST /refresh", () => {
        it("should successfully refresh tokens with valid refresh token", async () => {
            const mockRefreshData = createMockAuthResponse({
                data: {
                    user: createMockUser(),
                    session: createMockSession({
                        access_token: "new-access-token-789",
                        refresh_token: "new-refresh-token-012",
                    }),
                },
            });

            mockSupabase.auth.refreshSession.mockResolvedValue(
                mockRefreshData
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/refresh",
                cookies: {
                    refreshToken: "mock-refresh-token-456",
                },
            });

            expect(response.statusCode).toBe(200);
            expect(mockSupabase.auth.refreshSession).toHaveBeenCalledWith({
                refresh_token: "mock-refresh-token-456",
            });

            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data).toBeDefined();
            expect(body.data.tokens).toBeDefined();

            // Check new cookies were set
            const cookies = response.cookies;
            const accessTokenCookie = cookies.find(
                (c) => c.name === "accessToken"
            );
            const refreshTokenCookie = cookies.find(
                (c) => c.name === "refreshToken"
            );

            expect(accessTokenCookie?.value).toBe("new-access-token-789");
            expect(refreshTokenCookie?.value).toBe("new-refresh-token-012");
        });

        it("should return 401 when refresh token is missing", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/refresh",
                // No cookies provided
            });

            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error).toBe("No refresh token provided");
        });

        it("should return 401 for invalid refresh token", async () => {
            mockSupabase.auth.refreshSession.mockResolvedValue({
                data: { user: null, session: null },
                error: { message: "Invalid refresh token" },
            });

            const response = await fastify.inject({
                method: "POST",
                url: "/refresh",
                cookies: {
                    refreshToken: "invalid-refresh-token",
                },
            });

            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error.message).toContain("Invalid refresh token");
        });

        it("should return 401 for expired refresh token", async () => {
            mockSupabase.auth.refreshSession.mockResolvedValue({
                data: { user: null, session: null },
                error: { message: "refresh_token_not_found" },
            });

            const response = await fastify.inject({
                method: "POST",
                url: "/refresh",
                cookies: {
                    refreshToken: "expired-refresh-token",
                },
            });

            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error).toBeDefined();
        });

        it("should handle Supabase errors during refresh", async () => {
            mockSupabase.auth.refreshSession.mockRejectedValue(
                new Error("Service temporarily unavailable")
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/refresh",
                cookies: {
                    refreshToken: "mock-refresh-token-456",
                },
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error).toBeDefined();
        });

        it("should set httpOnly and sameSite flags on refresh token cookie", async () => {
            const mockRefreshData = createMockAuthResponse();
            mockSupabase.auth.refreshSession.mockResolvedValue(
                mockRefreshData
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/refresh",
                cookies: {
                    refreshToken: "mock-refresh-token-456",
                },
            });

            expect(response.statusCode).toBe(200);

            const refreshTokenCookie = response.cookies.find(
                (c) => c.name === "refreshToken"
            );

            expect(refreshTokenCookie?.httpOnly).toBe(true);
            expect(refreshTokenCookie?.sameSite).toBe("Strict");
        });

        it("should update both access and refresh tokens", async () => {
            const mockRefreshData = createMockAuthResponse({
                data: {
                    user: createMockUser(),
                    session: createMockSession({
                        access_token: "new-access-123",
                        refresh_token: "new-refresh-456",
                        expires_in: 7200,
                    }),
                },
            });

            mockSupabase.auth.refreshSession.mockResolvedValue(
                mockRefreshData
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/refresh",
                cookies: {
                    refreshToken: "old-refresh-token",
                },
            });

            expect(response.statusCode).toBe(200);

            const accessTokenCookie = response.cookies.find(
                (c) => c.name === "accessToken"
            );
            const refreshTokenCookie = response.cookies.find(
                (c) => c.name === "refreshToken"
            );

            expect(accessTokenCookie?.value).toBe("new-access-123");
            expect(refreshTokenCookie?.value).toBe("new-refresh-456");
        });
    });

    describe("OAuth routes", () => {
        it("should return authorization URL for Google", async () => {
            mockSupabase.auth.signInWithOAuth.mockResolvedValue({
                data: { url: "https://accounts.google.com/o/oauth2/auth" },
                error: null,
            });

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/google",
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.url).toBe(
                "https://accounts.google.com/o/oauth2/auth"
            );

            expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
                provider: "google",
                options: {
                    redirectTo: "http://localhost:3000/oauth/google",
                    scopes: "email profile",
                },
            });
        });

        it("should return 400 when OAuth URL generation fails", async () => {
            mockSupabase.auth.signInWithOAuth.mockResolvedValue({
                data: { url: null },
                error: { message: "Failed" },
            });

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/google",
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error.code).toBe("VALIDATION_ERROR");
        });

        it("should handle OAuth callback and set cookies", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/google/callback",
                payload: {
                    access_token: "mock-access-token-123",
                    refresh_token: "mock-refresh-token-456",
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.message).toBe(
                "OAuth authentication successful, tokens set in cookies"
            );
            expect(body.redirect).toBe("/");

            // Check cookies were set
            const cookies = response.cookies;
            const accessTokenCookie = cookies.find(
                (c) => c.name === "accessToken"
            );
            const refreshTokenCookie = cookies.find(
                (c) => c.name === "refreshToken"
            );

            expect(accessTokenCookie?.value).toBe("mock-access-token-123");
            expect(refreshTokenCookie?.value).toBe("mock-refresh-token-456");
        });

        it("should return 400 for missing OAuth callback tokens", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/google/callback",
                payload: {},
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
        });
    });

    describe("Login and Refresh Flow Integration", () => {
        it("should login and then refresh tokens successfully", async () => {
            // Step 1: Login
            const loginAuthData = createMockAuthResponse();
            mockSupabase.auth.signInWithPassword.mockResolvedValue(
                loginAuthData
            );

            const loginResponse = await fastify.inject({
                method: "POST",
                url: "/login",
                payload: {
                    email: "test@example.com",
                    password: "ValidPass123",
                },
            });

            expect(loginResponse.statusCode).toBe(200);

            const refreshTokenCookie = loginResponse.cookies.find(
                (c) => c.name === "refreshToken"
            );
            expect(refreshTokenCookie).toBeDefined();

            // Step 2: Use refresh token to get new tokens
            const refreshAuthData = createMockAuthResponse({
                data: {
                    user: createMockUser(),
                    session: createMockSession({
                        access_token: "refreshed-access-token",
                        refresh_token: "refreshed-refresh-token",
                    }),
                },
            });

            mockSupabase.auth.refreshSession.mockResolvedValue(
                refreshAuthData
            );

            const refreshResponse = await fastify.inject({
                method: "POST",
                url: "/refresh",
                cookies: {
                    refreshToken: refreshTokenCookie!.value,
                },
            });

            expect(refreshResponse.statusCode).toBe(200);

            const newAccessTokenCookie = refreshResponse.cookies.find(
                (c) => c.name === "accessToken"
            );
            expect(newAccessTokenCookie?.value).toBe("refreshed-access-token");
        });
    });

    describe("POST /validate-token", () => {
        it("should validate a valid access token", async () => {
            const mockUser = createMockUser();
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null,
            });

            const response = await fastify.inject({
                method: "POST",
                url: "/validate-token",
                headers: {
                    authorization: `Bearer mock-access-token-123`,
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.tokenRefreshed).toBe(false);
            expect(body.message).toBe("Token is valid");
            expect(body.data.user).toBeDefined();
            expect(body.data.user.email).toBe("test@example.com");
        });

        it("should validate token from cookies", async () => {
            const mockUser = createMockUser();
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null,
            });

            const response = await fastify.inject({
                method: "POST",
                url: "/validate-token",
                cookies: {
                    accessToken: "mock-access-token-123",
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.tokenRefreshed).toBe(false);
        });

        it("should refresh token when access token is invalid", async () => {
            const mockUser = createMockUser();
            
            // First call to getUser fails (invalid access token)
            mockSupabase.auth.getUser.mockRejectedValueOnce(
                new Error("Invalid token")
            );

            // Second call to refreshSession succeeds
            mockSupabase.auth.refreshSession.mockResolvedValue({
                data: {
                    user: mockUser,
                    session: createMockSession({
                        access_token: "refreshed-access-token",
                        refresh_token: "refreshed-refresh-token",
                    }),
                },
                error: null,
            });

            const response = await fastify.inject({
                method: "POST",
                url: "/validate-token",
                headers: {
                    authorization: `Bearer invalid-token`,
                },
                cookies: {
                    refreshToken: "mock-refresh-token-456",
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(true);
            expect(body.data.tokenRefreshed).toBe(true);
            expect(body.message).toBe("Token refreshed successfully");

            // Check new cookies were set
            const newAccessTokenCookie = response.cookies.find(
                (c) => c.name === "accessToken"
            );
            expect(newAccessTokenCookie?.value).toBe("refreshed-access-token");
        });

        it("should clear cookies when refresh token is invalid", async () => {
            // First call fails (invalid access token)
            mockSupabase.auth.getUser.mockRejectedValueOnce(
                new Error("Invalid token")
            );

            // Second call fails (invalid refresh token)
            mockSupabase.auth.refreshSession.mockResolvedValue({
                data: { user: null, session: null },
                error: { message: "Invalid refresh token" },
            });

            const response = await fastify.inject({
                method: "POST",
                url: "/validate-token",
                headers: {
                    authorization: `Bearer invalid-token`,
                },
                cookies: {
                    refreshToken: "invalid-refresh-token",
                },
            });

            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error).toContain("Refresh token invalid or expired");

            // Check cookies were cleared
            const accessTokenCookie = response.cookies.find(
                (c) => c.name === "accessToken"
            );
            const refreshTokenCookie = response.cookies.find(
                (c) => c.name === "refreshToken"
            );
            expect(accessTokenCookie?.value).toBe("");
            expect(refreshTokenCookie?.value).toBe("");
        });

        it("should return 401 when no tokens are provided", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/validate-token",
            });

            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error).toBe("No tokens provided");

            // Check cookies were cleared
            const accessTokenCookie = response.cookies.find(
                (c) => c.name === "accessToken"
            );
            const refreshTokenCookie = response.cookies.find(
                (c) => c.name === "refreshToken"
            );
            expect(accessTokenCookie?.value).toBe("");
            expect(refreshTokenCookie?.value).toBe("");
        });

        it("should clear cookies when access token is expired and no refresh token available", async () => {
            mockSupabase.auth.getUser.mockRejectedValueOnce(
                new Error("Invalid token")
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/validate-token",
                headers: {
                    authorization: `Bearer invalid-token`,
                },
            });

            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error).toContain("Access token expired");

            // Check cookies were cleared
            const accessTokenCookie = response.cookies.find(
                (c) => c.name === "accessToken"
            );
            expect(accessTokenCookie?.value).toBe("");
        });

        it("should handle server errors gracefully", async () => {
            // Mock both getUser and refreshSession to fail with non-auth errors
            mockSupabase.auth.getUser.mockRejectedValueOnce(
                new Error("Server error")
            );
            
            // Provide refresh token so it tries to refresh
            mockSupabase.auth.refreshSession.mockRejectedValueOnce(
                new Error("Database error")
            );

            const response = await fastify.inject({
                method: "POST",
                url: "/validate-token",
                headers: {
                    authorization: `Bearer mock-token`,
                },
                cookies: {
                    refreshToken: "mock-refresh-token",
                },
            });

            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.body);
            expect(body.success).toBe(false);
            expect(body.error).toContain("Refresh token invalid or expired");

            // Check cookies were cleared
            const accessTokenCookie = response.cookies.find(
                (c) => c.name === "accessToken"
            );
            expect(accessTokenCookie?.value).toBe("");
        });
    });

   
});
