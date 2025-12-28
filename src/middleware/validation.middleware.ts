import type { FastifyRequest, FastifyReply } from "fastify";
import { ZodSchema } from "zod";
import { ValidationError } from "../utils/errors.js";

export function validateBody(schema: ZodSchema) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            request.body = schema.parse(request.body);
        } catch (error) {
            throw error; // Will be caught by error handler
        }
    };
}

export function validateQuery(schema: ZodSchema) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            request.query = schema.parse(request.query);
        } catch (error) {
            throw error;
        }
    };
}
