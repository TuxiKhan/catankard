import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { createGame, getPlayerView } from '../_shared/engine/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'Yetkisiz erişim.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, authHeader.replace('Bearer ', ''));
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'Geçersiz kullanıcı oturumu.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { op } = body;

    if (op === 'create_room') {
      const { name, maxPlayers = 4, metropolisSide = 'A', turnTimerSeconds = 60 } = body;
      const code = generateRoomCode();

      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .insert({
          code,
          created_by: user.id,
          max_players: maxPlayers,
          metropolis_side: metropolisSide,
          turn_timer_seconds: turnTimerSeconds,
          status: 'lobby',
        })
        .select()
        .single();

      if (roomErr) throw roomErr;

      // Kurucuyu odaya ilk oyuncu olarak ekle
      const { error: pErr } = await supabase.from('room_players').insert({
        room_id: room.id,
        user_id: user.id,
        name: name || 'Oyuncu 1',
        seat_index: 0,
        is_host: true,
      });

      if (pErr) throw pErr;

      return new Response(JSON.stringify({ ok: true, roomId: room.id, code }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (op === 'join_room') {
      const { code, name } = body;
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (roomErr || !room) {
        return new Response(JSON.stringify({ ok: false, code: 'ROOM_NOT_FOUND', message: 'Oda bulunamadı.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Oyuncu zaten odada mı?
      const { data: existingPlayer } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingPlayer) {
        return new Response(JSON.stringify({ ok: true, roomId: room.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (room.status !== 'lobby') {
        return new Response(JSON.stringify({ ok: false, code: 'ROOM_STARTED', message: 'Oyun zaten başlamış.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: currentPlayers } = await supabase
        .from('room_players')
        .select('seat_index')
        .eq('room_id', room.id);

      const count = currentPlayers?.length ?? 0;
      if (count >= room.max_players) {
        return new Response(JSON.stringify({ ok: false, code: 'ROOM_FULL', message: 'Oda dolu.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const occupiedSeats = new Set((currentPlayers ?? []).map((p: any) => p.seat_index));
      let availableSeat = 0;
      while (occupiedSeats.has(availableSeat)) {
        availableSeat++;
      }

      const { error: joinErr } = await supabase.from('room_players').insert({
        room_id: room.id,
        user_id: user.id,
        name: name || `Oyuncu ${availableSeat + 1}`,
        seat_index: availableSeat,
        is_host: false,
      });

      if (joinErr) throw joinErr;

      return new Response(JSON.stringify({ ok: true, roomId: room.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (op === 'leave_room') {
      const { roomId } = body;
      await supabase
        .from('room_players')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (op === 'start_game') {
      const { roomId } = body;
      const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      if (!room || room.created_by !== user.id) {
        return new Response(JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'Yalnızca kurucu oyunu başlatabilir.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: players } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('seat_index', { ascending: true });

      if (!players || (players.length !== 3 && players.length !== 4)) {
        return new Response(JSON.stringify({ ok: false, code: 'INVALID_PLAYER_COUNT', message: 'Oyuncu sayısı 3 veya 4 olmalıdır.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const now = Date.now();
      const gameConfig = {
        players: players.map((p: any) => ({ id: p.user_id, name: p.name })),
        metropolisSide: room.metropolis_side,
        turnTimerSeconds: room.turn_timer_seconds,
        seed: `room-${roomId}-${now}`,
      };

      const initialState = createGame(gameConfig, now);

      // 1. game_states tablosuna yaz
      await supabase.from('game_states').upsert({
        room_id: roomId,
        state: initialState,
        version: 1,
        updated_at: new Date().toISOString(),
      });

      // 2. Her oyuncunun player_view'ını oluştur ve player_views tablosuna yaz
      for (const p of players) {
        const view = getPlayerView(initialState, p.user_id);
        await supabase.from('player_views').upsert({
          room_id: roomId,
          user_id: p.user_id,
          view,
          updated_at: new Date().toISOString(),
        });
      }

      // 3. Oda durumunu playing yap
      await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (op === 'end_game') {
      const { roomId } = body;
      const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      if (!room || room.created_by !== user.id) {
        return new Response(JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'Yalnızca kurucu oyunu sonlandırabilir.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: false, code: 'UNKNOWN_OP', message: 'Bilinmeyen işlem.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, code: 'INTERNAL_ERROR', message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
