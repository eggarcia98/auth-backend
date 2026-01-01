import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookiePlugin from "@fastify/cookie";
import { errorHandler } from "./middleware/error.middleware.js";
import { registerRoutes } from "./routes/index.js";
import { validateEnvironment, type Environment } from "./config/environment.js";
import {
    createSupabaseClient,
    createSupabaseAdminClient,
} from "./config/supabase.js";
import { AuthService } from "./services/auth.service.js";
import { OAuthService } from "./services/oauth.service.js";
import { logger } from "./utils/logger.js";

export interface AppConfig {
    env: Environment;
}

export async function createApp(config: AppConfig): Promise<FastifyInstance> {
    const fastify = Fastify({
        logger: false, // We use our custom logger
        trustProxy: true,
    });

    // Register CORS
    await fastify.register(cors, {
        origin: config.env.FRONTEND_URL,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    });

    // Register cookie plugin
    await fastify.register(cookiePlugin);

    // Set error handler
    fastify.setErrorHandler(errorHandler);

    // Initialize services
    const supabase = createSupabaseClient(config.env);
    const adminSupabase = createSupabaseAdminClient(config.env);
    const authService = new AuthService(supabase, adminSupabase);
    const oauthService = new OAuthService(supabase, config.env);

    // Register routes
    await registerRoutes(fastify, authService, oauthService);

    logger.info("Application initialized successfully", {
        environment: config.env.ENVIRONMENT,
    });

    return fastify;
}
