import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

if (!supabaseUrl) {
  console.warn('Missing Supabase URL. Using mock client.');
}

if (!supabaseServiceKey) {
  console.warn('Missing Supabase Service Key. Database writes might fail.');
}

// Create a single supabase client for interacting with your database
// Using service role key on the server side to bypass RLS for the admin app
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
});
