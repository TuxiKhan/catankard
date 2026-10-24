import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { createGame, getPlayerView } from '../_shared/engine/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-player-id',
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

    const { op } = body;

    if (op === 'create_room') {
      const { name, maxPlayers = 4, metropolisSide = 'A', turnTimerSeconds = 60 } = body;
      const code = generateRoomCode();

      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .insert({
          code,
          created_by: userId,
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
        user_id: userId,
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

      // 1. Oyuncu aynı user_id ile zaten odada mı?
      const { data: existingPlayerById } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingPlayerById) {
        // Var olan koltuğunu ve durumunu koruyarak last_seen_at ve (varsa) ismini güncelle
        const updateFields: any = { last_seen_at: new Date().toISOString() };
        if (name && name.trim()) {
          updateFields.name = name.trim();
        }
        await supabase
          .from('room_players')
          .update(updateFields)
          .eq('room_id', room.id)
          .eq('user_id', userId);

        return new Response(JSON.stringify({ ok: true, roomId: room.id, reconnected: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. Oyuncu oturumu yenilenmiş veya anon ID'si değişmiş fakat aynı isimle mi dönüyor?
      const { data: currentPlayers } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', room.id)
        .order('seat_index', { ascending: true });

      const currentPlayersList = currentPlayers ?? [];
      const trimmedName = name ? name.trim().toLowerCase() : '';
      const existingPlayerByName = trimmedName
        ? currentPlayersList.find((p: any) => p.name.trim().toLowerCase() === trimmedName)
        : null;

      if (existingPlayerByName) {
        const oldUserId = existingPlayerByName.user_id;

        // Eski kaydı silip yeni user_id ile aynı koltukta ekle
        await supabase
          .from('room_players')
          .delete()
          .eq('room_id', room.id)
          .eq('user_id', oldUserId);

        await supabase.from('room_players').insert({
          room_id: room.id,
          user_id: userId,
          name: existingPlayerByName.name,
          seat_index: existingPlayerByName.seat_index,
          is_host: existingPlayerByName.is_host,
          last_seen_at: new Date().toISOString(),
        });

        // Eğer eski ID oda kurucusuysa rooms.created_by değerini güncelle
        if (room.created_by === oldUserId) {
          await supabase
            .from('rooms')
            .update({ created_by: userId })
            .eq('id', room.id);
        }

        // Oyun zaten başlamışsa game_states ve player_views güncelle
        if (room.status === 'playing') {
          const { data: gsRow } = await supabase
            .from('game_states')
            .select('*')
            .eq('room_id', room.id)
            .single();

          if (gsRow && gsRow.state) {
            const state = gsRow.state;
            if (state.turnOrder) {
              state.turnOrder = state.turnOrder.map((id: string) => (id === oldUserId ? userId : id));
            }
            if (state.config?.players) {
              state.config.players = state.config.players.map((p: any) =>
                p.id === oldUserId ? { ...p, id: userId } : p
              );
            }
            if (state.hands && state.hands[oldUserId]) {
              state.hands[userId] = state.hands[oldUserId];
              delete state.hands[oldUserId];
            }
            if (state.areas && state.areas[oldUserId]) {
              state.areas[userId] = state.areas[oldUserId];
              delete state.areas[oldUserId];
            }
            if (state.longestRouteOwner === oldUserId) state.longestRouteOwner = userId;
            if (state.largestArmyOwner === oldUserId) state.largestArmyOwner = userId;
            if (state.winner === oldUserId) state.winner = userId;
            if (state.removedPlayers) {
              state.removedPlayers = state.removedPlayers.map((id: string) => (id === oldUserId ? userId : id));
            }
            if (state.tradeOffers) {
              state.tradeOffers.forEach((o: any) => {
                if (o.fromPlayerId === oldUserId) o.fromPlayerId = userId;
                if (o.toPlayerId === oldUserId) o.toPlayerId = userId;
              });
            }
            if (state.pendingDecisions) {
              state.pendingDecisions.forEach((d: any) => {
                if (d.playerId === oldUserId) d.playerId = userId;
              });
            }

            await supabase
              .from('game_states')
              .update({
                state,
                version: gsRow.version + 1,
                updated_at: new Date().toISOString(),
              })
              .eq('room_id', room.id);

            await supabase
              .from('player_views')
              .delete()
              .eq('room_id', room.id)
              .eq('user_id', oldUserId);

            const view = getPlayerView(state, userId);
            await supabase.from('player_views').upsert({
              room_id: room.id,
              user_id: userId,
              view,
              updated_at: new Date().toISOString(),
            });
          }
        }

        return new Response(JSON.stringify({ ok: true, roomId: room.id, reconnected: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 3. Yeni oyuncu katılma denetimleri
      if (room.status !== 'lobby') {
        return new Response(JSON.stringify({ ok: false, code: 'ROOM_STARTED', message: 'Oyun zaten başlamış.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const count = currentPlayersList.length;
      if (count >= room.max_players) {
        return new Response(JSON.stringify({ ok: false, code: 'ROOM_FULL', message: 'Oda dolu.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const occupiedSeats = new Set(currentPlayersList.map((p: any) => p.seat_index));
      let availableSeat = 0;
      while (occupiedSeats.has(availableSeat)) {
        availableSeat++;
      }

      const { error: joinErr } = await supabase.from('room_players').insert({
        room_id: room.id,
        user_id: userId,
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
      if (!roomId) {
        return new Response(JSON.stringify({ ok: false, code: 'MISSING_ROOM_ID', message: 'roomId belirtilmelidir.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (!room) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Odanın diğer oyuncularını sorgula (seat_index sırasıyla)
      const { data: otherPlayersData } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomId)
        .neq('user_id', userId)
        .order('seat_index', { ascending: true });

      const otherPlayers = otherPlayersData ?? [];
      const isHost = room.created_by === userId;

      if (otherPlayers.length > 0) {
        if (isHost) {
          // İlk sıradaki oyuncuyu yeni kurucu yap
          const newHost = otherPlayers[0];
          await supabase
            .from('rooms')
            .update({ created_by: newHost.user_id })
            .eq('id', roomId);

          await supabase
            .from('room_players')
            .update({ is_host: true })
            .eq('room_id', roomId)
            .eq('user_id', newHost.user_id);
        }

        if (room.status === 'lobby') {
          // Lobi aşamasındaysa eski kurucuyu / oyuncuyu sil
          await supabase
            .from('room_players')
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', userId);
        } else {
          // Oyun aşamasındaysa bağlantı koptu olarak tut (is_host=false yap, last_seen_at sıfırla)
          await supabase
            .from('room_players')
            .update({ is_host: false, last_seen_at: new Date(0).toISOString() })
            .eq('room_id', roomId)
            .eq('user_id', userId);
        }
      } else {
        // Odada hiç başka oyuncu kalmadıysa
        if (room.status === 'lobby') {
          await supabase.from('room_players').delete().eq('room_id', roomId).eq('user_id', userId);
          await supabase.from('rooms').delete().eq('id', roomId);
        } else {
          await supabase
            .from('room_players')
            .update({ is_host: false, last_seen_at: new Date(0).toISOString() })
            .eq('room_id', roomId)
            .eq('user_id', userId);
          await supabase.from('rooms').update({ status: 'abandoned' }).eq('id', roomId);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (op === 'start_game') {
      const { roomId } = body;
      const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      if (!room) {
        return new Response(JSON.stringify({ ok: false, code: 'ROOM_NOT_FOUND', message: 'Oda bulunamadı.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let isHost = room.created_by === userId;
      if (!isHost) {
        // Kurucu 60 saniyeden uzun süredir offline ise sıradaki aktif oyuncu kuruculuk yetkilerini devralır
        const now = Date.now();
        const { data: hostPlayer } = await supabase
          .from('room_players')
          .select('last_seen_at')
          .eq('room_id', roomId)
          .eq('user_id', room.created_by)
          .maybeSingle();

        const hostLastSeen = hostPlayer ? new Date(hostPlayer.last_seen_at).getTime() : 0;
        const hostOffline = !hostPlayer || (now - hostLastSeen > 60_000);

        if (hostOffline) {
          const { data: activePlayers } = await supabase
            .from('room_players')
            .select('*')
            .eq('room_id', roomId)
            .order('seat_index', { ascending: true });

          const onlinePlayers = (activePlayers ?? []).filter(
            (p: any) => (now - new Date(p.last_seen_at).getTime()) <= 60_000
          );

          if (onlinePlayers.length > 0 && onlinePlayers[0].user_id === userId) {
            isHost = true;
            await supabase.from('rooms').update({ created_by: userId }).eq('id', roomId);
            await supabase.from('room_players').update({ is_host: false }).eq('room_id', roomId).eq('user_id', room.created_by);
            await supabase.from('room_players').update({ is_host: true }).eq('room_id', roomId).eq('user_id', userId);
          }
        }
      }

      if (!isHost) {
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
      if (!room) {
        return new Response(JSON.stringify({ ok: false, code: 'ROOM_NOT_FOUND', message: 'Oda bulunamadı.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let isHost = room.created_by === userId;
      if (!isHost) {
        const now = Date.now();
        const { data: hostPlayer } = await supabase
          .from('room_players')
          .select('last_seen_at')
          .eq('room_id', roomId)
          .eq('user_id', room.created_by)
          .maybeSingle();

        const hostLastSeen = hostPlayer ? new Date(hostPlayer.last_seen_at).getTime() : 0;
        const hostOffline = !hostPlayer || (now - hostLastSeen > 60_000);

        if (hostOffline) {
          const { data: activePlayers } = await supabase
            .from('room_players')
            .select('*')
            .eq('room_id', roomId)
            .order('seat_index', { ascending: true });

          const onlinePlayers = (activePlayers ?? []).filter(
            (p: any) => (now - new Date(p.last_seen_at).getTime()) <= 60_000
          );

          if (onlinePlayers.length > 0 && onlinePlayers[0].user_id === userId) {
            isHost = true;
            await supabase.from('rooms').update({ created_by: userId }).eq('id', roomId);
            await supabase.from('room_players').update({ is_host: false }).eq('room_id', roomId).eq('user_id', room.created_by);
            await supabase.from('room_players').update({ is_host: true }).eq('room_id', roomId).eq('user_id', userId);
          }
        }
      }

      if (!isHost) {
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
