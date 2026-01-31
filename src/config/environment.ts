import { z } from "zod";

const envSchema = z.object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    APPLE_CLIENT_ID: z.string().optional(),
    APPLE_TEAM_ID: z.string().optional(),
    APPLE_KEY_ID: z.string().optional(),
    APPLE_PRIVATE_KEY: z.string().optional(),
    FRONTEND_URL: z.string().url(),
    ENVIRONMENT: z
        .enum(["development", "staging", "production"])
        .default("development"),
});

export type Environment = z.infer<typeof envSchema>;

export function validateEnvironment(env: Record<string, unknown>): Environment {
    try {
        return envSchema.parse(env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues.map(
                (i) => `${i.path.join(".")}: ${i.message}`
            );
            throw new Error(
                `Environment validation failed:\n${issues.join("\n")}`
            );
        }
        throw error;
    }
}
