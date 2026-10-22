import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
  applyAction,
  applyTick,
  getPlayerView,
  type Action,
  type GameState,
} from '../_shared/engine/index.ts';

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
      return new Response(JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'Oyuncu kimliği eksik.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { roomId, action, tick } = body;

    if (!roomId) {
      return new Response(JSON.stringify({ ok: false, code: 'MISSING_ROOM_ID', message: 'roomId belirtilmelidir.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // İyimser kilitleme ile game_state çek
    const { data: row, error: fetchErr } = await supabase
      .from('game_states')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (fetchErr || !row) {
      return new Response(JSON.stringify({ ok: false, code: 'GAME_NOT_FOUND', message: 'Oyun durumu bulunamadı.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentState: GameState = row.state;
    const currentVersion: number = row.version;
    const now = Date.now();

    let result;
    if (tick) {
      result = applyTick(currentState, now);
    } else if (action) {
      // remove_player için backend ek doğrulama: hedef 60 sn'dir kopuk mu?
      if (action.type === 'remove_player') {
        const { data: targetPlayer } = await supabase
          .from('room_players')
          .select('last_seen_at')
          .eq('room_id', roomId)
          .eq('user_id', action.playerId)
          .single();

        if (targetPlayer) {
          const lastSeen = new Date(targetPlayer.last_seen_at).getTime();
          if (now - lastSeen < 60_000) {
            return new Response(JSON.stringify({
              ok: false,
              code: 'PLAYER_NOT_DISCONNECTED',
              message: 'Oyuncu son 1 dakika içinde aktifti, henüz oyundan atılamaz.',
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }

      result = applyAction(currentState, userId, action as Action, now);
    } else {
      return new Response(JSON.stringify({ ok: false, code: 'INVALID_REQUEST', message: 'action veya tick parametresi gereklidir.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nextState = result.state;

    // İyimser kilitleme ile güncelle
    const { data: updatedRow, error: updateErr } = await supabase
      .from('game_states')
      .update({
        state: nextState,
        version: currentVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('room_id', roomId)
      .eq('version', currentVersion)
      .select()
      .maybeSingle();

    if (updateErr || !updatedRow) {
      return new Response(JSON.stringify({
        ok: false,
        code: 'CONCURRENCY_CONFLICT',
        message: 'Aynı anda başka bir hamle yapıldı, lütfen tekrar deneyin.',
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Tüm oyuncuların player_view'larını güncelle
    for (const pid of nextState.turnOrder) {
      const view = getPlayerView(nextState, pid);
      await supabase.from('player_views').upsert({
        room_id: roomId,
        user_id: pid,
        view,
        updated_at: new Date().toISOString(),
      });
    }

    // Oyun bittiyse odayı güncelle
    if (nextState.phase === 'finished' && nextState.winner) {
      await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId);
    }

    const callerUserView = getPlayerView(nextState, userId);
    return new Response(JSON.stringify({ ok: true, view: callerUserView }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const isIllegal = err.name === 'IllegalMoveError' || err.code;
    return new Response(JSON.stringify({
      ok: false,
      code: err.code || 'ACTION_ERROR',
      message: err.message,
    }), {
      status: isIllegal ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
