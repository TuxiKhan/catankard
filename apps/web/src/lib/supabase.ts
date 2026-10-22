import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oykohkhaptgyeeeyauon.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95a29oa2hhcHRneWVlZXlhdW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NjMxODMsImV4cCI6MjEwODEzOTE4M30.9CoUzP8SI3cPXT7kULQE_bHh1hq8ioU-EHt_P09gQSI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Oyuncu için şeffaf oturum açar.
 * 1. Mevcut session varsa döner.
 * 2. Anonymous sign-in açıksa onu kullanır.
 * 3. Kapalıysa yerel misafir hesabı oluşturur/giriş yapar (kullanıcıya hissettirmez).
 */
export async function ensureAnonymousAuth(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    return session.user.id;
  }

  // 1. Anonim giriş dene
  try {
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    if (!anonError && anonData?.user) {
      return anonData.user.id;
    }
  } catch {}

  // 2. Misafir hesabı fallback (Projede anonim kapalıysa kesintisiz devam)
  let guestCreds = localStorage.getItem('catankard_guest_creds');
  let email = '';
  let password = '';

  if (guestCreds) {
    try {
      const parsed = JSON.parse(guestCreds);
      email = parsed.email;
      password = parsed.password;
    } catch {}
  }

  if (!email || !password) {
    const rand = Math.random().toString(36).substring(2, 9);
    email = `guest_${Date.now()}_${rand}@gmail.com`;
    password = `guest-pass-${rand}-${Date.now()}`;
    localStorage.setItem('catankard_guest_creds', JSON.stringify({ email, password }));
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (!signInError && signInData?.user) {
    return signInData.user.id;
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) {
    throw signUpError;
  }
  return signUpData.user!.id;
}
