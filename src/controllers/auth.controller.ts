import type { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../services/auth.service.js";
import { OAuthService } from "../services/oauth.service.js";
import type {
    LoginRequest,
    SignupRequest,
    OAuthProvider,
    OAuthCallbackRequest,
} from "../types/auth.types.js";
import type { ApiResponse } from "../types/api.types.js";

export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly oauthService: OAuthService
    ) {}

    async signup(
        request: FastifyRequest<{ Body: SignupRequest }>,
        reply: FastifyReply
    ): Promise<void> {
        const result = await this.authService.signup(request.body);

        reply.status(201).send({
            success: true,
            data: result,
        } as ApiResponse);
    }

    async login(
        request: FastifyRequest<{ Body: LoginRequest }>,
        reply: FastifyReply
    ): Promise<void> {
        const result = await this.authService.login(request.body);

        reply.send({
            success: true,
            data: result,
        } as ApiResponse);
    }

    async loginWithOTP(
        request: FastifyRequest<{ Body: { email: string } }>,
        reply: FastifyReply
    ): Promise<void> {
        await this.authService.loginWithOTP(request.body.email);

        reply.send({
            success: true,
            data: { message: "OTP sent to email" },
        } as ApiResponse);
    }

    async verifyOTP(
        request: FastifyRequest<{ Body: { email: string; token: string } }>,
        reply: FastifyReply
    ): Promise<void> {
        const result = await this.authService.verifyOTP(
            request.body.email,
            request.body.token
        );

        reply.send({
            success: true,
            data: result,
        } as ApiResponse);
    }

    async refreshToken(
        request: FastifyRequest<{ Body: { refreshToken: string } }>,
        reply: FastifyReply
    ): Promise<void> {
        const result = await this.authService.refreshToken(
            request.body.refreshToken
        );

        reply.send({
            success: true,
            data: result,
        } as ApiResponse);
    }

    async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const token = request.headers.authorization?.substring(7) || "";
        await this.authService.logout(token);

        reply.send({
            success: true,
            data: { message: "Logged out successfully" },
        } as ApiResponse);
    }

    async requestPasswordReset(
        request: FastifyRequest<{ Body: { email: string } }>,
        reply: FastifyReply
    ): Promise<void> {
        await this.authService.requestPasswordReset(request.body.email);

        reply.send({
            success: true,
            data: { message: "Password reset email sent" },
        } as ApiResponse);
    }

    async resetPassword(
        request: FastifyRequest<{ Body: { password: string } }>,
        reply: FastifyReply
    ): Promise<void> {
        const token = request.headers.authorization?.substring(7) || "";
        await this.authService.resetPassword(token, request.body.password);

        reply.send({
            success: true,
            data: { message: "Password reset successfully" },
        } as ApiResponse);
    }

    async getOAuthUrl(
        request: FastifyRequest<{ Params: { provider: OAuthProvider } }>,
        reply: FastifyReply
    ): Promise<void> {
        const url = await this.oauthService.getAuthorizationUrl(
            request.params.provider
        );

        reply.send({
            success: true,
            data: { url },
        } as ApiResponse);
    }

    async handleOAuthCallback(
        request: FastifyRequest<{
            Params: { provider: OAuthProvider };
            Body: OAuthCallbackRequest;
        }>,
        reply: FastifyReply
    ): Promise<void> {
        const result = await this.oauthService.handleCallback(
            request.params.provider,
            request.body.code
        );

        reply.send({
            success: true,
            data: result,
        } as ApiResponse);
    }

    async me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        reply.send({
            success: true,
            data: { user: request.user },
        } as ApiResponse);
    }
}
