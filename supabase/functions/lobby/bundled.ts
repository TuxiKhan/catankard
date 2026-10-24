// supabase/functions/lobby/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// supabase/functions/_shared/engine/cards.ts
var EMPTY_RESOURCES = Object.freeze({
  brick: 0,
  wood: 0,
  wool: 0,
  wheat: 0,
  ore: 0
});
function totalResourceCount(res) {
  return res.brick + res.wood + res.wool + res.wheat + res.ore;
}
function createInitialResourceDeck() {
  const deck = [];
  for (let i = 0; i < 11; i++) deck.push("brick");
  for (let i = 0; i < 11; i++) deck.push("wood");
  for (let i = 0; i < 14; i++) deck.push("wool");
  for (let i = 0; i < 12; i++) deck.push("wheat");
  for (let i = 0; i < 13; i++) deck.push("ore");
  return deck;
}
function createInitialBuildingDeck() {
  const deck = [];
  let idCounter = 1;
  for (let i = 0; i < 10; i++) deck.push({ id: `bld-road-${idCounter++}`, type: "road" });
  for (let i = 0; i < 11; i++) deck.push({ id: `bld-settlement-${idCounter++}`, type: "settlement" });
  for (let i = 0; i < 5; i++) deck.push({ id: `bld-city-${idCounter++}`, type: "city" });
  for (let i = 0; i < 8; i++) deck.push({ id: `bld-knight-${idCounter++}`, type: "knight" });
  return deck;
}
function createInitialEventDeck() {
  const events = [
    { id: "evt-robber-1", kind: "robber" },
    { id: "evt-robber-2", kind: "robber" },
    { id: "evt-robber-3", kind: "robber" },
    { id: "evt-solstice-1", kind: "solstice" },
    { id: "evt-abundance-1", kind: "abundance" },
    { id: "evt-subsidy-1", kind: "subsidy" },
    { id: "evt-charity-1", kind: "charity" }
  ];
  return events;
}
function createMetropolisStack(side) {
  if (side === "A") {
    return [
      { id: "metro-A-1", side: "A" },
      { id: "metro-A-2", side: "A" },
      { id: "metro-A-3", side: "A" },
      { id: "metro-A-4", side: "A" }
    ];
  }
  const bKinds = ["knights", "roads", "longest_route", "largest_army"];
  return bKinds.map((kind, idx) => ({
    id: `metro-B-${idx + 1}-${kind}`,
    side: "B",
    kind
  }));
}

// supabase/functions/_shared/engine/random.ts
function hashSeed(seedStr) {
  let hash = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    hash = Math.imul(hash ^ seedStr.charCodeAt(i), 3432918353);
    hash = hash << 13 | hash >>> 19;
  }
  return hash >>> 0;
}
function createRng(seed) {
  const numSeed = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
  return { seed: numSeed };
}
function nextRandom(rng) {
  rng.seed = rng.seed + 1831565813 | 0;
  let t = Math.imul(rng.seed ^ rng.seed >>> 15, 1 | rng.seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function nextInt(rng, maxExclusive) {
  if (maxExclusive <= 0) return 0;
  return Math.floor(nextRandom(rng) * maxExclusive);
}
function shuffle(rng, array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = nextInt(rng, i + 1);
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

// supabase/functions/_shared/engine/victory.ts
function calculateVisibleVP(state, playerId) {
  const area = state.areas[playerId];
  if (!area) return 0;
  let vp = 0;
  for (const stack of area.stacks) {
    if (stack.top === "settlement") {
      vp += 1;
    } else if (stack.top === "city") {
      vp += 2;
    } else if (stack.top === "metropolis") {
      vp += 3;
    }
  }
  if (state.longestRouteOwner === playerId) {
    vp += 2;
  }
  if (state.largestArmyOwner === playerId) {
    vp += 2;
  }
  return vp;
}
function checkWinCondition(state) {
  if (state.phase === "finished" || state.winner) return true;
  const activePid = state.turnOrder[state.activePlayerIndex];
  if (!activePid || state.removedPlayers.includes(activePid)) return false;
  const vp = calculateVisibleVP(state, activePid);
  if (vp >= 7) {
    state.winner = activePid;
    state.phase = "finished";
    state.log.push({ t: "game_won", playerId: activePid });
    return true;
  }
  return false;
}

// supabase/functions/_shared/engine/events.ts
function drawResourceCard(state) {
  if (state.resourceDeck.length === 0) {
    if (state.resourceDiscard.length === 0) {
      return null;
    }
    const rng = state.rng;
    state.resourceDeck = shuffle(rng, [...state.resourceDiscard]);
    state.resourceDiscard = [];
  }
  return state.resourceDeck.pop() ?? null;
}
function giveResourcesToPlayer(state, playerId, count) {
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    const card = drawResourceCard(state);
    if (!card) break;
    state.hands[playerId][card]++;
    drawn++;
  }
  return drawn;
}

// supabase/functions/_shared/engine/actions.ts
function checkAndReshuffleBuildingRow(state) {
  if (state.buildingRow.length < 5) return false;
  const firstType = state.buildingRow[0].type;
  const allSame = state.buildingRow.every((c) => c.type === firstType);
  if (!allSame) return false;
  const rng = state.rng;
  state.buildingDeck.push(...state.buildingRow);
  state.buildingRow = [];
  state.buildingDeck = shuffle(rng, state.buildingDeck);
  while (state.buildingRow.length < 5 && state.buildingDeck.length > 0) {
    state.buildingRow.push(state.buildingDeck.pop());
  }
  state.log.push({ t: "row_reshuffled" });
  return true;
}

// supabase/functions/_shared/engine/view.ts
function createPlayerView(state, playerId) {
  const activePlayerId = state.turnOrder[state.activePlayerIndex] ?? "";
  const playersSummary = {};
  for (const p of state.config.players) {
    const hand = state.hands[p.id];
    const area = state.areas[p.id] ?? { roads: 0, knights: 0, stacks: [] };
    const vp = calculateVisibleVP(state, p.id);
    const removed = state.removedPlayers.includes(p.id);
    playersSummary[p.id] = {
      name: p.name,
      handCount: hand ? totalResourceCount(hand) : 0,
      area,
      visibleVP: vp,
      removed
    };
  }
  let lastEvent = null;
  for (let i = state.log.length - 1; i >= 0; i--) {
    const entry = state.log[i];
    if (entry && entry.t === "event") {
      lastEvent = entry.kind;
      break;
    }
  }
  const { seed: _, ...configWithoutSeed } = state.config;
  return {
    you: playerId,
    config: configWithoutSeed,
    turnOrder: [...state.turnOrder],
    activePlayerId,
    turnNumber: state.turnNumber,
    turnDeadline: state.turnDeadline,
    phase: state.phase,
    yourHand: state.hands[playerId] ? { ...state.hands[playerId] } : { brick: 0, wood: 0, wool: 0, wheat: 0, ore: 0 },
    players: playersSummary,
    resourceDeckCount: state.resourceDeck.length,
    resourceDiscardCount: state.resourceDiscard.length,
    buildingDeckCount: state.buildingDeck.length,
    buildingRow: state.buildingRow.map((c) => ({ ...c })),
    metropolisStack: state.metropolisStack.map((m) => ({ ...m })),
    eventDeckCount: state.eventDeck.length,
    lastEvent,
    longestRouteOwner: state.longestRouteOwner,
    largestArmyOwner: state.largestArmyOwner,
    turnFlags: { ...state.turnFlags },
    tradeOffers: state.tradeOffers.map((o) => ({ ...o })),
    pendingDecisions: state.pendingDecisions.map((d) => ({ ...d })),
    winner: state.winner,
    recentLog: state.log.slice(-30)
  };
}

// supabase/functions/_shared/engine/index.ts
function createGame(config, now) {
  if (config.players.length < 3 || config.players.length > 4) {
    throw new Error("Oyuncu say\u0131s\u0131 3 veya 4 olmal\u0131d\u0131r.");
  }
  const rng = createRng(config.seed);
  let resourceDeck = shuffle(rng, createInitialResourceDeck());
  const resourceDiscard = [];
  let buildingDeck = shuffle(rng, createInitialBuildingDeck());
  const eventDeck = shuffle(rng, createInitialEventDeck());
  const eventDiscard = [];
  const metropolisStack = createMetropolisStack(config.metropolisSide);
  const startingSettlementCards = [
    { isStartingPlayerCard: true },
    { isStartingPlayerCard: false },
    { isStartingPlayerCard: false }
  ];
  if (config.players.length === 4) {
    startingSettlementCards.push({ isStartingPlayerCard: false });
  }
  shuffle(rng, startingSettlementCards);
  const turnOrder = config.players.map((p) => p.id);
  const hands = {};
  const areas = {};
  let startingPlayerIndex = 0;
  for (let i = 0; i < config.players.length; i++) {
    const pid = config.players[i].id;
    const settlementCard = startingSettlementCards[i];
    if (settlementCard.isStartingPlayerCard) {
      startingPlayerIndex = i;
    }
    hands[pid] = { brick: 0, wood: 0, wool: 0, wheat: 0, ore: 0 };
    const initialStack = {
      id: `stack-init-${pid}`,
      top: "settlement",
      isStarting: true,
      isStartingPlayerCard: settlementCard.isStartingPlayerCard
    };
    areas[pid] = {
      roads: 1,
      // 1 Başlangıç Yolu
      knights: 0,
      stacks: [initialStack]
      // 1 Başlangıç Köyü
    };
  }
  const buildingRow = [];
  for (let i = 0; i < 5; i++) {
    const card = buildingDeck.pop();
    if (card) buildingRow.push(card);
  }
  const state = {
    config,
    rng,
    turnOrder,
    activePlayerIndex: startingPlayerIndex,
    turnNumber: 1,
    turnDeadline: config.turnTimerSeconds ? now + config.turnTimerSeconds * 1e3 : null,
    phase: "action",
    hands,
    areas,
    resourceDeck,
    resourceDiscard,
    buildingDeck,
    buildingRow,
    metropolisStack,
    eventDeck,
    eventDiscard,
    longestRouteOwner: null,
    largestArmyOwner: null,
    turnFlags: { traded: false, roadSubstitutionUsed: false },
    tradeOffers: [],
    pendingDecisions: [],
    removedPlayers: [],
    winner: null,
    log: []
  };
  checkAndReshuffleBuildingRow(state);
  for (const pid of turnOrder) {
    giveResourcesToPlayer(state, pid, 2);
  }
  const firstPlayer = turnOrder[startingPlayerIndex];
  state.log.push({ t: "turn_started", playerId: firstPlayer });
  checkWinCondition(state);
  return state;
}
function getPlayerView(state, playerId) {
  return createPlayerView(state, playerId);
}

// supabase/functions/lobby/index.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-player-id"
};
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");
    const headerPlayerId = req.headers.get("x-player-id");
    const body = await req.json();
    let userId = null;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const userClient = createClient(supabaseUrl, authHeader.replace("Bearer ", ""));
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          userId = user.id;
        }
      } catch {
      }
    }
    if (!userId) {
      userId = headerPlayerId || body.playerId;
    }
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, code: "UNAUTHORIZED", message: "Oyuncu kimli\u011Fi eksik." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const { op } = body;
    if (op === "create_room") {
      const { name, maxPlayers = 4, metropolisSide = "A", turnTimerSeconds = 60 } = body;
      const code = generateRoomCode();
      const { data: room, error: roomErr } = await supabase.from("rooms").insert({
        code,
        created_by: userId,
        max_players: maxPlayers,
        metropolis_side: metropolisSide,
        turn_timer_seconds: turnTimerSeconds,
        status: "lobby"
      }).select().single();
      if (roomErr) throw roomErr;
      const { error: pErr } = await supabase.from("room_players").insert({
        room_id: room.id,
        user_id: userId,
        name: name || "Oyuncu 1",
        seat_index: 0,
        is_host: true
      });
      if (pErr) throw pErr;
      return new Response(JSON.stringify({ ok: true, roomId: room.id, code }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (op === "join_room") {
      const { code, name } = body;
      const { data: room, error: roomErr } = await supabase.from("rooms").select("*").eq("code", code.toUpperCase()).single();
      if (roomErr || !room) {
        return new Response(JSON.stringify({ ok: false, code: "ROOM_NOT_FOUND", message: "Oda bulunamad\u0131." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const { data: existingPlayerById } = await supabase.from("room_players").select("*").eq("room_id", room.id).eq("user_id", userId).maybeSingle();
      if (existingPlayerById) {
        const updateFields = { last_seen_at: (/* @__PURE__ */ new Date()).toISOString() };
        if (name && name.trim()) {
          updateFields.name = name.trim();
        }
        await supabase.from("room_players").update(updateFields).eq("room_id", room.id).eq("user_id", userId);
        return new Response(JSON.stringify({ ok: true, roomId: room.id, reconnected: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const { data: currentPlayers } = await supabase.from("room_players").select("*").eq("room_id", room.id).order("seat_index", { ascending: true });
      const currentPlayersList = currentPlayers ?? [];
      const trimmedName = name ? name.trim().toLowerCase() : "";
      const existingPlayerByName = trimmedName ? currentPlayersList.find((p) => p.name.trim().toLowerCase() === trimmedName) : null;
      if (existingPlayerByName) {
        const oldUserId = existingPlayerByName.user_id;
        await supabase.from("room_players").delete().eq("room_id", room.id).eq("user_id", oldUserId);
        await supabase.from("room_players").insert({
          room_id: room.id,
          user_id: userId,
          name: existingPlayerByName.name,
          seat_index: existingPlayerByName.seat_index,
          is_host: existingPlayerByName.is_host,
          last_seen_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (room.created_by === oldUserId) {
          await supabase.from("rooms").update({ created_by: userId }).eq("id", room.id);
        }
        if (room.status === "playing") {
          const { data: gsRow } = await supabase.from("game_states").select("*").eq("room_id", room.id).single();
          if (gsRow && gsRow.state) {
            const state = gsRow.state;
            if (state.turnOrder) {
              state.turnOrder = state.turnOrder.map((id) => id === oldUserId ? userId : id);
            }
            if (state.config?.players) {
              state.config.players = state.config.players.map(
                (p) => p.id === oldUserId ? { ...p, id: userId } : p
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
              state.removedPlayers = state.removedPlayers.map((id) => id === oldUserId ? userId : id);
            }
            if (state.tradeOffers) {
              state.tradeOffers.forEach((o) => {
                if (o.fromPlayerId === oldUserId) o.fromPlayerId = userId;
                if (o.toPlayerId === oldUserId) o.toPlayerId = userId;
              });
            }
            if (state.pendingDecisions) {
              state.pendingDecisions.forEach((d) => {
                if (d.playerId === oldUserId) d.playerId = userId;
              });
            }
            await supabase.from("game_states").update({
              state,
              version: gsRow.version + 1,
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            }).eq("room_id", room.id);
            await supabase.from("player_views").delete().eq("room_id", room.id).eq("user_id", oldUserId);
            const view = getPlayerView(state, userId);
            await supabase.from("player_views").upsert({
              room_id: room.id,
              user_id: userId,
              view,
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        }
        return new Response(JSON.stringify({ ok: true, roomId: room.id, reconnected: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (room.status !== "lobby") {
        return new Response(JSON.stringify({ ok: false, code: "ROOM_STARTED", message: "Oyun zaten ba\u015Flam\u0131\u015F." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const count = currentPlayersList.length;
      if (count >= room.max_players) {
        return new Response(JSON.stringify({ ok: false, code: "ROOM_FULL", message: "Oda dolu." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const occupiedSeats = new Set(currentPlayersList.map((p) => p.seat_index));
      let availableSeat = 0;
      while (occupiedSeats.has(availableSeat)) {
        availableSeat++;
      }
      const { error: joinErr } = await supabase.from("room_players").insert({
        room_id: room.id,
        user_id: userId,
        name: name || `Oyuncu ${availableSeat + 1}`,
        seat_index: availableSeat,
        is_host: false
      });
      if (joinErr) throw joinErr;
      return new Response(JSON.stringify({ ok: true, roomId: room.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (op === "leave_room") {
      const { roomId } = body;
      if (!roomId) {
        return new Response(JSON.stringify({ ok: false, code: "MISSING_ROOM_ID", message: "roomId belirtilmelidir." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const { data: room } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
      if (!room) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const { data: otherPlayersData } = await supabase.from("room_players").select("*").eq("room_id", roomId).neq("user_id", userId).order("seat_index", { ascending: true });
      const otherPlayers = otherPlayersData ?? [];
      const isHost = room.created_by === userId;
      if (otherPlayers.length > 0) {
        if (isHost) {
          const newHost = otherPlayers[0];
          await supabase.from("rooms").update({ created_by: newHost.user_id }).eq("id", roomId);
          await supabase.from("room_players").update({ is_host: true }).eq("room_id", roomId).eq("user_id", newHost.user_id);
        }
        if (room.status === "lobby") {
          await supabase.from("room_players").delete().eq("room_id", roomId).eq("user_id", userId);
        } else {
          await supabase.from("room_players").update({ is_host: false, last_seen_at: (/* @__PURE__ */ new Date(0)).toISOString() }).eq("room_id", roomId).eq("user_id", userId);
        }
      } else {
        if (room.status === "lobby") {
          await supabase.from("room_players").delete().eq("room_id", roomId).eq("user_id", userId);
          await supabase.from("rooms").delete().eq("id", roomId);
        } else {
          await supabase.from("room_players").update({ is_host: false, last_seen_at: (/* @__PURE__ */ new Date(0)).toISOString() }).eq("room_id", roomId).eq("user_id", userId);
          await supabase.from("rooms").update({ status: "abandoned" }).eq("id", roomId);
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (op === "start_game") {
      const { roomId } = body;
      const { data: room } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (!room) {
        return new Response(JSON.stringify({ ok: false, code: "ROOM_NOT_FOUND", message: "Oda bulunamad\u0131." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      let isHost = room.created_by === userId;
      if (!isHost) {
        const now2 = Date.now();
        const { data: hostPlayer } = await supabase.from("room_players").select("last_seen_at").eq("room_id", roomId).eq("user_id", room.created_by).maybeSingle();
        const hostLastSeen = hostPlayer ? new Date(hostPlayer.last_seen_at).getTime() : 0;
        const hostOffline = !hostPlayer || now2 - hostLastSeen > 6e4;
        if (hostOffline) {
          const { data: activePlayers } = await supabase.from("room_players").select("*").eq("room_id", roomId).order("seat_index", { ascending: true });
          const onlinePlayers = (activePlayers ?? []).filter(
            (p) => now2 - new Date(p.last_seen_at).getTime() <= 6e4
          );
          if (onlinePlayers.length > 0 && onlinePlayers[0].user_id === userId) {
            isHost = true;
            await supabase.from("rooms").update({ created_by: userId }).eq("id", roomId);
            await supabase.from("room_players").update({ is_host: false }).eq("room_id", roomId).eq("user_id", room.created_by);
            await supabase.from("room_players").update({ is_host: true }).eq("room_id", roomId).eq("user_id", userId);
          }
        }
      }
      if (!isHost) {
        return new Response(JSON.stringify({ ok: false, code: "UNAUTHORIZED", message: "Yaln\u0131zca kurucu oyunu ba\u015Flatabilir." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const { data: players } = await supabase.from("room_players").select("*").eq("room_id", roomId).order("seat_index", { ascending: true });
      if (!players || players.length !== 3 && players.length !== 4) {
        return new Response(JSON.stringify({ ok: false, code: "INVALID_PLAYER_COUNT", message: "Oyuncu say\u0131s\u0131 3 veya 4 olmal\u0131d\u0131r." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const now = Date.now();
      const gameConfig = {
        players: players.map((p) => ({ id: p.user_id, name: p.name })),
        metropolisSide: room.metropolis_side,
        turnTimerSeconds: room.turn_timer_seconds,
        seed: `room-${roomId}-${now}`
      };
      const initialState = createGame(gameConfig, now);
      await supabase.from("game_states").upsert({
        room_id: roomId,
        state: initialState,
        version: 1,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      for (const p of players) {
        const view = getPlayerView(initialState, p.user_id);
        await supabase.from("player_views").upsert({
          room_id: roomId,
          user_id: p.user_id,
          view,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      await supabase.from("rooms").update({ status: "playing" }).eq("id", roomId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (op === "end_game") {
      const { roomId } = body;
      const { data: room } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (!room) {
        return new Response(JSON.stringify({ ok: false, code: "ROOM_NOT_FOUND", message: "Oda bulunamad\u0131." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      let isHost = room.created_by === userId;
      if (!isHost) {
        const now = Date.now();
        const { data: hostPlayer } = await supabase.from("room_players").select("last_seen_at").eq("room_id", roomId).eq("user_id", room.created_by).maybeSingle();
        const hostLastSeen = hostPlayer ? new Date(hostPlayer.last_seen_at).getTime() : 0;
        const hostOffline = !hostPlayer || now - hostLastSeen > 6e4;
        if (hostOffline) {
          const { data: activePlayers } = await supabase.from("room_players").select("*").eq("room_id", roomId).order("seat_index", { ascending: true });
          const onlinePlayers = (activePlayers ?? []).filter(
            (p) => now - new Date(p.last_seen_at).getTime() <= 6e4
          );
          if (onlinePlayers.length > 0 && onlinePlayers[0].user_id === userId) {
            isHost = true;
            await supabase.from("rooms").update({ created_by: userId }).eq("id", roomId);
            await supabase.from("room_players").update({ is_host: false }).eq("room_id", roomId).eq("user_id", room.created_by);
            await supabase.from("room_players").update({ is_host: true }).eq("room_id", roomId).eq("user_id", userId);
          }
        }
      }
      if (!isHost) {
        return new Response(JSON.stringify({ ok: false, code: "UNAUTHORIZED", message: "Yaln\u0131zca kurucu oyunu sonland\u0131rabilir." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      await supabase.from("rooms").update({ status: "finished" }).eq("id", roomId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ ok: false, code: "UNKNOWN_OP", message: "Bilinmeyen i\u015Flem." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, code: "INTERNAL_ERROR", message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
