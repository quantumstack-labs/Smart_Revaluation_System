
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'placeholder-key';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase Environment Variables missing. Using placeholder values for UI development.");
}

export const supabase = createClient(
    supabaseUrl || fallbackUrl, 
    supabaseAnonKey || fallbackKey
);
