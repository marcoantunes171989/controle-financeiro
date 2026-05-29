import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY');
}

// Not typed with Database generic to maintain compatibility with TypeScript 4.9
// Each hook types its own select() results via explicit return annotations.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
