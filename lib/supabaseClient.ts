// lib/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// These must match your environment variables:
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Export a singleton Supabase client for use throughout your app
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
