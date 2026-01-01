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

    async signup(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const result = await this.authService.signup(
            request.body as SignupRequest
        );

        reply.status(201).send({
            success: true,
            data: result,
        } as ApiResponse);
    }

    async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const result = await this.authService.login(
            request.body as LoginRequest
        );

        // Set tokens in cookies
        reply.setCookie("accessToken", result.tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: result.tokens.expiresIn,
        });

        reply.setCookie("refreshToken", result.tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        reply.send({
            success: true,
            message: "Login successful, tokens set in cookies",
        } as ApiResponse);
    }

    async loginWithOTP(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const { email } = request.body as { email: string };
        await this.authService.loginWithOTP(email);

        reply.send({
            success: true,
            data: { message: "OTP sent to email" },
        } as ApiResponse);
    }

    async verifyOTP(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const { email, token } = request.body as {
            email: string;
            token: string;
        };
        const result = await this.authService.verifyOTP(email, token);

        reply.send({
            success: true,
            data: result,
        } as ApiResponse);
    }

    async refreshToken(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const refreshToken = request.cookies.refreshToken;
        
        if (!refreshToken) {
            reply.status(401).send({
                success: false,
                error: "No refresh token provided",
            });
            return;
        }

        const result = await this.authService.refreshToken(refreshToken);

        // Set new tokens in cookies
        reply.setCookie("accessToken", result.tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: result.tokens.expiresIn,
        });

        reply.setCookie("refreshToken", result.tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        reply.send({
            success: true,
            data: result,
        } as ApiResponse);
    }

    async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const token = request.headers.authorization?.substring(7) || "";
        await this.authService.logout(token);

        // Clear cookies
        reply.clearCookie("accessToken");
        reply.clearCookie("refreshToken");

        reply.send({
            success: true,
            data: { message: "Logged out successfully" },
        } as ApiResponse);
    }

    async requestPasswordReset(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const { email } = request.body as { email: string };
        await this.authService.requestPasswordReset(email);

        reply.send({
            success: true,
            data: { message: "Password reset email sent" },
        } as ApiResponse);
    }

    async resetPassword(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const token = request.headers.authorization?.substring(7) || "";
        const { password } = request.body as { password: string };
        await this.authService.resetPassword(token, password);

        reply.send({
            success: true,
            data: { message: "Password reset successfully" },
        } as ApiResponse);
    }

    async getOAuthUrl(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const { provider } = request.params as { provider: OAuthProvider };
        const url = await this.oauthService.getAuthorizationUrl(provider);

        reply.send({
            success: true,
            data: { url },
        } as ApiResponse);
    }

    async handleOAuthCallback(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<void> {
        const { provider } = request.params as { provider: OAuthProvider };
        const { code } = request.body as OAuthCallbackRequest;
        const result = await this.oauthService.handleCallback(provider, code);

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
