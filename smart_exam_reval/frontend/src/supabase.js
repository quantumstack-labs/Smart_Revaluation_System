
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase Environment Variables!");
    console.error("URL:", supabaseUrl);
    console.error("Key:", supabaseAnonKey ? "Found" : "Missing");
    throw new Error('Supabase URL and Key are required in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
