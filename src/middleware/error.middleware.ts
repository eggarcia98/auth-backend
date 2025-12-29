import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { ZodError } from "zod";

export async function errorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // Log error
    logger.error("Request error", error, {
        path: request.url,
        method: "request.method",
    });

    // Handle Zod validation errors
    if (error instanceof ZodError) {
        reply.status(400).send({
            success: false,
            error: {
                message: "Validation failed",
                code: "VALIDATION_ERROR",
                details: error.errors,
            },
        });
        return;
    }

    // Handle custom app errors
    if (error instanceof AppError) {
        reply.status(error.statusCode).send({
            success: false,
            error: {
                message: error.message,
                code: error.code,
            },
        });
        return;
    }

    // Handle Fastify errors
    if (error.statusCode) {
        reply.status(error.statusCode).send({
            success: false,
            error: {
                message: error.message,
                code: "REQUEST_ERROR",
            },
        });
        return;
    }

    // Handle unknown errors
    reply.status(500).send({
        success: false,
        error: {
            message: "Internal server error",
            code: "INTERNAL_ERROR",
        },
    });
}
