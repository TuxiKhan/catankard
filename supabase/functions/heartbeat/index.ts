import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-player-id',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');
    const headerPlayerId = req.headers.get('x-player-id');
    const body = await req.json();

    let userId: string | null = null;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const userClient = createClient(supabaseUrl, authHeader.replace('Bearer ', ''));
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          userId = user.id;
        }
      } catch {}
    }

    if (!userId) {
      userId = headerPlayerId || body.playerId;
    }

    if (!userId) {
      return new Response(JSON.stringify({ ok: false, code: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { roomId } = body;
    let hostTransferred = false;
    let view: any = null;

    if (roomId) {
      const now = Date.now();
      await supabase
        .from('room_players')
        .update({ last_seen_at: new Date(now).toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      const { data: viewRow } = await supabase
        .from('player_views')
        .select('view')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();

      if (viewRow?.view) {
        view = viewRow.view;
      }

      // Kurucu kontrolü ve gerekirse devir:
      const { data: room } = await supabase
        .from('rooms')
        .select('id, created_by, status')
        .eq('id', roomId)
        .maybeSingle();

      if (room && room.status !== 'finished' && room.status !== 'abandoned') {
        const { data: hostPlayer } = await supabase
          .from('room_players')
          .select('user_id, last_seen_at')
          .eq('room_id', roomId)
          .eq('user_id', room.created_by)
          .maybeSingle();

        const hostLastSeen = hostPlayer ? new Date(hostPlayer.last_seen_at).getTime() : 0;
        const isHostOffline = !hostPlayer || (now - hostLastSeen > 60_000);

        if (isHostOffline) {
          // Kurucu 60 saniyeden uzun süredir offline!
          // Kalan diğer oyuncuları seat_index sırasına göre al
          const { data: otherPlayers } = await supabase
            .from('room_players')
            .select('*')
            .eq('room_id', roomId)
            .neq('user_id', room.created_by)
            .order('seat_index', { ascending: true });

          // Son 60 saniyede aktif olan ilk oyuncu, yoksa sıradaki ilk oyuncu
          const newHost = (otherPlayers ?? []).find(
            (p: any) => (now - new Date(p.last_seen_at).getTime()) <= 60_000
          ) ?? otherPlayers?.[0];

          if (newHost) {
            await supabase
              .from('rooms')
              .update({ created_by: newHost.user_id })
              .eq('id', roomId);

            await supabase
              .from('room_players')
              .update({ is_host: false })
              .eq('room_id', roomId)
              .eq('user_id', room.created_by);

            await supabase
              .from('room_players')
              .update({ is_host: true })
              .eq('room_id', roomId)
              .eq('user_id', newHost.user_id);

            hostTransferred = true;
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, hostTransferred, view }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
