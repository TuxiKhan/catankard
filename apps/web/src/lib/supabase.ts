import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oykohkhaptgyeeeyauon.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95a29oa2hhcHRneWVlZXlhdW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NjMxODMsImV4cCI6MjEwODEzOTE4M30.9CoUzP8SI3cPXT7kULQE_bHh1hq8ioU-EHt_P09gQSI';

function getOrCreateGuestPlayerId(): string {
  if (typeof window === 'undefined') return '';
  let guestId = localStorage.getItem('catankard_player_id');
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem('catankard_player_id', guestId);
  }
  return guestId;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-player-id': getOrCreateGuestPlayerId(),
    },
  },
});

/**
 * Oyuncu için şeffaf, sıfır-sürtünmeli misafir kimliği üretir veya getirir.
 * GoTrue email limitlerine veya kapalı anon auth ayarlarına takılmaz.
 */
export async function ensureAnonymousAuth(): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch {}

  return getOrCreateGuestPlayerId();
}

/**
 * Edge Function çağrıları için yardımcı fonksiyon
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body: Record<string, any>
): Promise<T> {
  const playerId = await ensureAnonymousAuth();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || supabaseAnonKey;

  const url = `${supabaseUrl}/functions/v1/${functionName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': supabaseAnonKey,
      'x-player-id': playerId,
    },
    body: JSON.stringify({ ...body, playerId }),
  });

  const resJson = await response.json();
  if (!response.ok || resJson.ok === false) {
    throw new Error(resJson.message || `İşlem başarısız: ${response.statusText}`);
  }
  return resJson as T;
}
