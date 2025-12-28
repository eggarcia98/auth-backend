import type { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../services/auth.service.js";
import { UnauthorizedError } from "../utils/errors.js";

declare module "fastify" {
    interface FastifyRequest {
        user?: {
            id: string;
            email: string;
        };
    }
}

export function createAuthMiddleware(authService: AuthService) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const authHeader = request.headers.authorization;

            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                throw new UnauthorizedError(
                    "Missing or invalid authorization header"
                );
            }

            const token = authHeader.substring(7);
            const user = await authService.verifyToken(token);

            request.user = {
                id: user.id,
                email: user.email,
            };
        } catch (error) {
            throw new UnauthorizedError("Invalid or expired token");
        }
    };
}
