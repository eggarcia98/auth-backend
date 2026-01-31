export interface User {
    id: string;
    email: string;
    emailVerified: boolean;
    provider: "email" | "google" | "apple";
    createdAt: Date;
    updatedAt: Date;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface AuthResponse {
    user: User;
    tokens: AuthTokens;
    message?: string;
    email?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface SignupRequest {
    email: string;
    password: string;
}

export interface OAuthCallbackRequest {
    access_token: string;
    refresh_token: string;
    provider_token?: string;
    expires_in?: string;
}

export type OAuthProvider = "google" | "apple";
