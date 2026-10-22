import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oykohkhaptgyeeeyauon.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_key_if_missing';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function ensureAnonymousAuth(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    return session.user.id;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('Anonymous sign in error:', error);
    throw error;
  }
  return data.user!.id;
}
