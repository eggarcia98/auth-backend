import {
    AuthTokenResponsePassword,
    SupabaseClient,
} from "@supabase/supabase-js";
import type {
    AuthResponse,
    LoginRequest,
    SignupRequest,
    User,
} from "../types/auth.types.js";
import {
    UnauthorizedError,
    ConflictError,
    ValidationError,
} from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export class AuthService {
    constructor(
        private readonly supabase: SupabaseClient,
        private readonly adminSupabase: SupabaseClient
    ) {}

    async signup(request: SignupRequest): Promise<AuthResponse> {
        try {
            const res = await this.supabase.auth.signUp({
                email: request.email,
                password: request.password,
                options: {
                    emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
                },
            });

            const { data, error } = res;

            if (error) {
                if (error.message.includes("already registered")) {
                    throw new ConflictError("Email already registered");
                }
                throw new ValidationError(error.message);
            }

            if (!data?.user) {
                throw new ValidationError("Failed to create user");
            }

            // If email confirmation is required, session will be null
            if (!data.session) {
                logger.info("User signed up, email confirmation required", {
                    userId: data.user.id,
                    email: request.email,
                });

                const { user, session} = data;

                return this.mapAuthResponse({ user, session } as any, true);
            }

            // Email confirmation disabled, return full auth response
            logger.info("User signed up successfully", {
                userId: data.user.id,
                email: request.email,
            });

            const { user, session } = data;
            return this.mapAuthResponse({ user, session });
        } catch (error) {
            logger.error("Signup failed", error as Error, {
                email: request.email,
            });
            throw error;
        }
    }

    async login(request: LoginRequest): Promise<AuthResponse> {
        try {

          
            const { data, error } = await this.supabase.auth.signInWithPassword(
                {
                    email: request.email,
                    password: request.password,
                }
            );

            console.log("Supabase response data:", data);
            console.log("Supabase response error:", error);


            if (error) {
                throw new UnauthorizedError("Invalid email or password");
            }

            if (!data?.user || !data?.session) {
                throw new UnauthorizedError("Invalid email or password");
            }

            logger.info("User logged in successfully", {
                userId: data.user.id,
            });

            return this.mapAuthResponse(data);
        } catch (error) {
            logger.error("Login failed", error as Error, {
                email: request.email,
            });
            throw error;
        }
    }

    async loginWithOTP(email: string): Promise<void> {
        try {
            const { error } = await this.supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
                },
            });

            if (error) {
                throw new ValidationError(error.message);
            }

            logger.info("OTP sent successfully", { email });
        } catch (error) {
            logger.error("OTP login failed", error as Error, { email });
            throw error;
        }
    }

    async verifyOTP(email: string, token: string): Promise<AuthResponse> {
        try {
            const { data, error } = await this.supabase.auth.verifyOtp({
                email,
                token,
                type: "email",
            });

            if (error) {
                throw new UnauthorizedError("Invalid or expired OTP");
            }

            if (!data?.user || !data?.session) {
                throw new UnauthorizedError("Invalid or expired OTP");
            }

            logger.info("OTP verified successfully", { userId: data.user.id });

            const { user, session } = data;
            return this.mapAuthResponse({ user, session });
        } catch (error) {
            logger.error("OTP verification failed", error as Error, { email });
            throw error;
        }
    }

    async refreshToken(refreshToken: string): Promise<AuthResponse> {
        try {
            const { data, error } = await this.supabase.auth.refreshSession({
                refresh_token: refreshToken,
            });

            if (error || !data?.session || !data?.user) {
                throw new UnauthorizedError("Invalid refresh token");
            }

            logger.info("Token refreshed successfully", {
                userId: data.user?.id,
            });

            const { user, session } = data;
            return this.mapAuthResponse({ user, session });
        } catch (error) {
            logger.error("Token refresh failed", error as Error);
            throw error;
        }
    }

    async logout(accessToken: string): Promise<void> {
        try {
            await this.supabase.auth.admin.signOut(accessToken);
            logger.info("User logged out successfully");
        } catch (error) {
            logger.error("Logout failed", error as Error);
            throw error;
        }
    }

    async requestPasswordReset(email: string): Promise<void> {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
                }
            );

            if (error) {
                throw new ValidationError(error.message);
            }

            logger.info("Password reset requested", { email });
        } catch (error) {
            logger.error("Password reset request failed", error as Error, {
                email,
            });
            throw error;
        }
    }

    async resetPassword(
        accessToken: string,
        newPassword: string
    ): Promise<void> {
        try {
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                throw new ValidationError(error.message);
            }

            logger.info("Password reset successfully");
        } catch (error) {
            logger.error("Password reset failed", error as Error);
            throw error;
        }
    }

    async verifyToken(token: string): Promise<User> {
        try {
            const { data, error } = await this.supabase.auth.getUser(token);

            if (error || !data.user) {
                throw new UnauthorizedError("Invalid token");
            }

            return this.mapUser(data.user);
        } catch (error) {
            logger.error("Token verification failed", error as Error);
            throw error;
        }
    }

    private mapAuthResponse(
        data: AuthTokenResponsePassword["data"],
        isSigningUp = false
    ): AuthResponse {
        if (!data.user || (!data.session && !isSigningUp)) {
            throw new UnauthorizedError("Invalid authentication data");
        }

        return {
            user: this.mapUser(data.user),
            tokens: {
                accessToken: data?.session?.access_token,
                refreshToken: data?.session?.refresh_token,
                expiresIn: data?.session?.expires_in,
            },
        };
    }

    private mapUser(user: {
        id: string;
        email?: string;
        email_confirmed_at?: string;
        app_metadata?: { provider?: string };
        created_at?: string;
        updated_at?: string;
    }): User {
        return {
            id: user.id,
            email: user.email || "",
            emailVerified: !!user.email_confirmed_at,
            provider:
                (user.app_metadata?.provider as "email" | "google" | "apple") ||
                "email",
            createdAt: new Date(user.created_at || Date.now()),
            updatedAt: new Date(user.updated_at || Date.now()),
        };
    }
}
