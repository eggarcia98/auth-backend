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
        oauthService = new OAuthService(mockSupabase as any);
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
});
