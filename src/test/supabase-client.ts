import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase URL and Anon Key must be set in environment variables');
}

export const createAnonClient = () => {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
};

export const createAuthenticatedClient = async (email?: string, password?: string) => {
    if (!email || !password) {
        throw new Error('Email and password required for authenticated client');
    }

    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        throw new Error(`Failed to sign in as ${email}: ${error.message}`);
    }

    return client;
};

export const createServiceRoleClient = () => {
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SERVICE_ROLE_KEY) {
        // Return null or throw depending on strategy. For now allow throwing to signal missing config.
        throw new Error('SUPABASE_SERVICE_ROLE_KEY not found in environment');
    }
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}
