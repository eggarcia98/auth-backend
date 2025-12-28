import { createApp } from "./app.js";
import { validateEnvironment } from "./config/environment.js";
import { logger } from "./utils/logger.js";

interface CloudflareEnv {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    JWT_SECRET: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    APPLE_CLIENT_ID?: string;
    APPLE_TEAM_ID?: string;
    APPLE_KEY_ID?: string;
    APPLE_PRIVATE_KEY?: string;
    FRONTEND_URL: string;
    ENVIRONMENT: "development" | "staging" | "production";
}

export default {
    async fetch(
        request: Request,
        env: CloudflareEnv,
        ctx: ExecutionContext
    ): Promise<Response> {
        try {
            // Validate environment variables
            const validatedEnv = validateEnvironment(env);

            // Create and configure Fastify app
            const app = await createApp({ env: validatedEnv });

            // Convert Cloudflare Request to Node-like request for Fastify
            const url = new URL(request.url);

            await app.ready();

            // Handle the request
            const response = await app.inject({
                method: request.method,
                url: url.pathname + url.search,
                headers: Object.fromEntries(request.headers.entries()),
                payload: request.body ? await request.text() : undefined,
            });

            // Convert Fastify response to Cloudflare Response
            return new Response(response.body, {
                status: response.statusCode,
                headers: response.headers as HeadersInit,
            });
        } catch (error) {
            logger.error("Request handling failed", error as Error);

            return new Response(
                JSON.stringify({
                    success: false,
                    error: {
                        message: "Internal server error",
                        code: "INTERNAL_ERROR",
                    },
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    },
};
