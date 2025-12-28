import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Environment } from "./environment.js";

export function createSupabaseClient(env: Environment): SupabaseClient {
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: false,
        },
    });
}

export function createSupabaseAdminClient(env: Environment): SupabaseClient {
    return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
