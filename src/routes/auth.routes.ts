import type { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/auth.controller.js";
import { createAuthMiddleware } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";
import {
    loginSchema,
    signupSchema,
    emailSchema,
    resetPasswordSchema,
    oauthCallbackSchema,
} from "../schemas/auth.schemas.js";
import { AuthService } from "../services/auth.service.js";

export async function authRoutes(
    fastify: FastifyInstance,
    authController: AuthController,
    authService: AuthService
): Promise<void> {
    const authMiddleware = createAuthMiddleware(authService);

    // Public routes
    fastify.post(
        "/signup",
        { preHandler: validateBody(signupSchema) },
        authController.signup.bind(authController)
    );

    fastify.post(
        "/login",
        { preHandler: validateBody(loginSchema) },
        authController.login.bind(authController)
    );

    fastify.post(
        "/login/otp",
        { preHandler: validateBody(emailSchema) },
        authController.loginWithOTP.bind(authController)
    );

    fastify.post("/verify-otp", authController.verifyOTP.bind(authController));

    fastify.post("/refresh", authController.refreshToken.bind(authController));

    fastify.post(
        "/forgot-password",
        { preHandler: validateBody(emailSchema) },
        authController.requestPasswordReset.bind(authController)
    );

    fastify.post(
        "/reset-password",
        { preHandler: [authMiddleware, validateBody(resetPasswordSchema)] },
        authController.resetPassword.bind(authController)
    );

    // OAuth routes
    fastify.get(
        "/oauth/:provider",
        authController.getOAuthUrl.bind(authController)
    );

    fastify.post(
        "/oauth/:provider/callback",
        { preHandler: validateBody(oauthCallbackSchema) },
        authController.handleOAuthCallback.bind(authController)
    );

    // Protected routes
    fastify.post(
        "/logout",
        { preHandler: authMiddleware },
        authController.logout.bind(authController)
    );

    fastify.get(
        "/me",
        { preHandler: authMiddleware },
        authController.me.bind(authController)
    );

    // Validate and refresh token endpoint
    fastify.post(
        "/validate-token",
        authController.validateAndRefreshToken.bind(authController)
    );
}
