import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.routes.js";
import { AuthController } from "../controllers/auth.controller.js";
import { AuthService } from "../services/auth.service.js";
import { OAuthService } from "../services/oauth.service.js";

export async function registerRoutes(
    fastify: FastifyInstance,
    authService: AuthService,
    oauthService: OAuthService
): Promise<void> {
    const authController = new AuthController(authService, oauthService);

    // Health check
    fastify.get("/health", async () => ({
        status: "ok",
        timestamp: Date.now(),
    }));

    // API routes
    await fastify.register(
        async (instance) => {
            await authRoutes(instance, authController, authService);
        },
        { prefix: "/api/v1/auth" }
    );
}
