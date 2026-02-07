import { vi } from "vitest";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { errorHandler } from "../src/middleware/error.middleware.js";

// Mock Supabase client
export const createMockSupabaseClient = () => {
    return {
        auth: {
            signUp: vi.fn(),
            signInWithPassword: vi.fn(),
            signInWithOAuth: vi.fn(),
            signInWithOtp: vi.fn(),
            verifyOtp: vi.fn(),
            exchangeCodeForSession: vi.fn(),
            refreshSession: vi.fn(),
            resetPasswordForEmail: vi.fn(),
            updateUser: vi.fn(),
            getUser: vi.fn(),
            admin: {
                signOut: vi.fn(),
            },
        },
    };
};

// Create test Fastify instance
export const createTestServer = async (): Promise<FastifyInstance> => {
    const fastify = Fastify({
        logger: false, // Disable logging in tests
    });

    await fastify.register(cookie);
    
    // Register error handler
    fastify.setErrorHandler(errorHandler);

    return fastify;
};

// Helper to create mock user data
export const createMockUser = (overrides = {}) => ({
    id: "test-user-id-123",
    email: "test@example.com",
    aud: "authenticated",
    role: "authenticated",
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    ...overrides,
});

// Helper to create mock session data
export const createMockSession = (overrides = {}) => ({
    access_token: "mock-access-token-123",
    refresh_token: "mock-refresh-token-456",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: createMockUser(),
    ...overrides,
});

// Helper to create mock auth response
export const createMockAuthResponse = (overrides = {}) => ({
    data: {
        user: createMockUser(),
        session: createMockSession(),
    },
    error: null,
    ...overrides,
});
