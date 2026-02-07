import { SupabaseClient } from "@supabase/supabase-js";
import type { OAuthProvider, AuthResponse } from "../types/auth.types.js";
import { ValidationError, UnauthorizedError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import type { Environment } from "../config/environment.js";

export class OAuthService {
    constructor(
        private readonly supabase: SupabaseClient,
        private readonly env: Environment
    ) {}

    async getAuthorizationUrl(provider: OAuthProvider): Promise<string> {
        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${this.env.FRONTEND_URL}/auth/${provider}/callback`,
                    scopes: this.getProviderScopes(provider),
                },
                
            });

            if (error || !data.url) {
                throw new ValidationError(
                    `Failed to generate ${provider} authorization URL`
                );
            }

            logger.info("OAuth authorization URL generated with PKCE", { provider });

            return data.url;
        } catch (error) {
            logger.error("Failed to get OAuth URL", error as Error, {
                provider,
            });
            throw error;
        }
    }

    async handleCallback(
        provider: OAuthProvider,
        code: string
    ): Promise<AuthResponse> {
        try {
            const { data, error } =
                await this.supabase.auth.exchangeCodeForSession(code);

            if (error || !data.session || !data.user) {
                throw new UnauthorizedError(
                    "Failed to authenticate with OAuth provider"
                );
            }

            logger.info("OAuth callback handled successfully", {
                provider,
                userId: data.user.id,
            });

            return {
                user: {
                    id: data.user.id,
                    email: data.user.email || "",
                    emailVerified: !!data.user.email_confirmed_at,
                    provider,
                    createdAt: new Date(data.user.created_at || Date.now()),
                    updatedAt: new Date(data.user.updated_at || Date.now()),
                },
                tokens: {
                    accessToken: data.session.access_token,
                    refreshToken: data.session.refresh_token,
                    expiresIn: data.session.expires_in,
                },
            };
        } catch (error) {
            logger.error("OAuth callback failed", error as Error, { provider });
            throw error;
        }
    }

    private getProviderScopes(provider: OAuthProvider): string {
        const scopes: Record<OAuthProvider, string> = {
            google: "email profile",
            apple: "email name",
        };

        return scopes[provider];
    }
}
