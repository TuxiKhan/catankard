import React, { useEffect, useState } from 'react';
import type { Action, PlayerView, Resource, ResourceCounts } from '@catankard/engine';
import { CardModal } from './components/CardModal.tsx';
import { CharityModal } from './components/CharityModal.tsx';
import { GameDesk3P } from './components/GameDesk3P.tsx';
import { GameDesk4P } from './components/GameDesk4P.tsx';
import { Lobby } from './components/Lobby.tsx';
import { RobberModal } from './components/RobberModal.tsx';
import { TradeModal } from './components/TradeModal.tsx';
import { getCardDetails, type CardDetails } from './lib/cardImages.ts';
import { ensureAnonymousAuth, invokeEdgeFunction, supabase } from './lib/supabase.ts';

export const App: React.FC = () => {
  const [userId, setUserId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('catankard_player_name') || '';
  });
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<any | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [playerView, setPlayerView] = useState<PlayerView | null>(null);

  // Modallar
  const [inspectedCard, setInspectedCard] = useState<CardDetails | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [eventNotification, setEventNotification] = useState<string | null>(null);

  // 1. Anonim Oturum Başlatma
  useEffect(() => {
    ensureAnonymousAuth()
      .then((id) => setUserId(id))
      .catch((err) => console.error('Auth failed:', err));
  }, []);

  const handleUpdatePlayerName = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('catankard_player_name', name);
  };

  // 2. Realtime Abonelikleri (Lobi & Oyun Durumu)
  useEffect(() => {
    if (!roomId) return;

    // Oda tablosunu dinle
    const roomChannel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new) setRoom(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        () => {
          fetchRoomPlayers(roomId);
        }
      )
      .subscribe();

    // Kendi player_view satırını dinle
    const viewChannel = supabase
      .channel(`view:${roomId}:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_views',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.user_id === userId) {
            const nextView: PlayerView = payload.new.view;
            setPlayerView(nextView);

            // Yeni olay bildirim kontrolü
            if (nextView.lastEvent) {
              const eventMessages: Record<string, string> = {
                robber: '🏴‍☠️ HIRSIZ! 7\'den fazla kaynağı olan tüm oyuncular elinin yarısını atıyor.',
                solstice: '☀️ YENİ YIL! Her oyuncu 1 kaynak çekti ve olay destesi yeniden karıştırıldı.',
                abundance: '🌾 BOLLUK! En Uzun Yol ve En Büyük Ordu\'ya sahip olmayanlar 2 kaynak kazandı.',
                subsidy: '🎉 HASAT KUTLAMASI! Her oyuncu masadaki her köyü için 1 kaynak çekti.',
                charity: '🤝 SADAKA! En çok zafer puanına sahip oyuncular en az puanlılara 1 kaynak veriyor.',
              };
              const msg = eventMessages[nextView.lastEvent];
              if (msg) {
                setEventNotification(msg);
                setTimeout(() => setEventNotification(null), 7000);
              }
            }
          }
        }
      )
      .subscribe();

    fetchRoom(roomId);
    fetchRoomPlayers(roomId);

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(viewChannel);
    };
  }, [roomId, userId]);

  // 3. Heartbeat (Her 15 saniyede bir son görülme zamanını güncelle)
  useEffect(() => {
    if (!roomId || !userId) return;

    const interval = setInterval(() => {
      invokeEdgeFunction('heartbeat', { roomId }).catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, [roomId, userId]);

  // 4. Periyodik Tick (Süre dolduğunda otomatik tur geçişi ve karar çözümü)
  useEffect(() => {
    if (!roomId || !playerView || playerView.phase === 'finished') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const isTurnExpired = playerView.turnDeadline && now >= playerView.turnDeadline;
      const isDecisionExpired = playerView.pendingDecisions.some((d) => d.deadline <= now);

      if (isTurnExpired || isDecisionExpired) {
        // Süre doldu, backend'e hafif tick gönder
        invokeEdgeFunction('game-action', { roomId, tick: true })
          .then((res) => {
            if (res.view) setPlayerView(res.view);
          })
          .catch(() => {});
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [roomId, playerView]);

  const fetchRoom = async (id: string) => {
    const { data } = await supabase.from('rooms').select('*').eq('id', id).single();
    if (data) setRoom(data);
  };

  const fetchRoomPlayers = async (id: string) => {
    const { data } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', id)
      .order('seat_index', { ascending: true });
    if (data) setPlayers(data);
  };

  // Lobi Eylemleri
  const handleCreateRoom = async (options: {
    maxPlayers: number;
    metropolisSide: 'A' | 'B';
    turnTimerSeconds: number | null;
  }) => {
    const data = await invokeEdgeFunction<{ ok: boolean; roomId: string; code: string }>('lobby', {
      op: 'create_room',
      name: playerName,
      ...options,
    });
    setRoomId(data.roomId);
  };

  const handleJoinRoom = async (code: string) => {
    const data = await invokeEdgeFunction<{ ok: boolean; roomId: string }>('lobby', {
      op: 'join_room',
      code,
      name: playerName,
    });
    setRoomId(data.roomId);
  };

  const handleStartGame = async () => {
    if (!roomId) return;
    await invokeEdgeFunction('lobby', { op: 'start_game', roomId });
  };

  const handleLeaveRoom = async () => {
    if (!roomId) return;
    try {
      await invokeEdgeFunction('lobby', { op: 'leave_room', roomId });
    } catch {}
    setRoomId(null);
    setRoom(null);
    setPlayers([]);
    setPlayerView(null);
  };

  // Oyun Hamlesi İletme (Edge Function: game-action)
  const dispatchAction = async (action: Action) => {
    if (!roomId) return;
    try {
      const data = await invokeEdgeFunction<{ ok: boolean; view?: PlayerView }>('game-action', {
        roomId,
        action,
      });
      if (data.view) {
        setPlayerView(data.view);
      }
    } catch (err: any) {
      alert(err.message || 'Hamle gerçekleştirilemedi.');
    }
  };

  const handleInspectCard = (type: any, subKind?: any) => {
    const details = getCardDetails(type, subKind);
    setInspectedCard(details);
  };

  const isGameActive = room?.status === 'playing' && playerView;

  return (
    <div className="relative min-h-screen bg-slate-950">
      {/* Olay Bildirimi Banner'ı */}
      {eventNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-2xl border-2 border-amber-300 animate-in slide-in-from-top duration-300 flex items-center gap-3 max-w-xl text-center">
          <span className="text-sm md:text-base">{eventNotification}</span>
          <button
            onClick={() => setEventNotification(null)}
            className="text-xs bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 px-2 py-1 rounded-lg font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {!isGameActive ? (
        <Lobby
          currentUserId={userId}
          playerName={playerName}
          onUpdatePlayerName={handleUpdatePlayerName}
          room={room}
          players={players}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
        />
      ) : playerView.turnOrder.length === 3 ? (
        <GameDesk3P
          view={playerView}
          onInspectCard={handleInspectCard}
          onOpenTrade={() => setIsTradeModalOpen(true)}
          onEndTurn={() => dispatchAction({ type: 'end_turn' })}
          onBuild={(cardId, source, onStackId, substitution) =>
            dispatchAction({
              type: 'build',
              target: source === 'row' ? { source: 'row', cardId, onStackId } : { source: 'metropolis', cardId, onStackId: onStackId! },
              substitution,
            })
          }
          onLeaveGame={handleLeaveRoom}
        />
      ) : (
        <GameDesk4P
          view={playerView}
          onInspectCard={handleInspectCard}
          onOpenTrade={() => setIsTradeModalOpen(true)}
          onEndTurn={() => dispatchAction({ type: 'end_turn' })}
          onBuild={(cardId, source, onStackId, substitution) =>
            dispatchAction({
              type: 'build',
              target: source === 'row' ? { source: 'row', cardId, onStackId } : { source: 'metropolis', cardId, onStackId: onStackId! },
              substitution,
            })
          }
          onLeaveGame={handleLeaveRoom}
        />
      )}

      {/* Kart İnceleme Modalı */}
      <CardModal card={inspectedCard} onClose={() => setInspectedCard(null)} />

      {/* Ticaret Modalı */}
      {playerView && (
        <TradeModal
          view={playerView}
          isOpen={isTradeModalOpen}
          onClose={() => setIsTradeModalOpen(false)}
          onProposeTrade={async (toPlayerId, give, want) => {
            await dispatchAction({ type: 'propose_trade', toPlayerId, give, want });
          }}
          onAcceptTrade={async (offerId) => {
            await dispatchAction({ type: 'accept_trade', offerId });
            setIsTradeModalOpen(false);
          }}
          onCancelTrade={async (offerId) => {
            await dispatchAction({ type: 'cancel_trade', offerId });
          }}
        />
      )}

      {/* Hırsız Kart Atma Modalı */}
      {playerView && (
        <RobberModal
          view={playerView}
          onDiscard={async (decisionId, cards) => {
            await dispatchAction({ type: 'discard', decisionId, cards });
          }}
        />
      )}

      {/* Sadaka Modalı */}
      {playerView && (
        <CharityModal
          view={playerView}
          onGive={async (decisionId, toPlayerId, resource) => {
            await dispatchAction({ type: 'charity_give', decisionId, toPlayerId, resource });
          }}
        />
      )}

      {/* Oyun Sonu Zafer Ekranı */}
      {playerView?.winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in zoom-in-95">
          <div className="bg-slate-900 border-4 border-yellow-500 rounded-3xl max-w-md w-full p-8 text-center shadow-2xl">
            <span className="text-5xl block mb-3">🏆</span>
            <h2 className="text-3xl font-black text-yellow-400 mb-2">OYUN BİTTİ!</h2>
            <p className="text-lg text-slate-200 mb-6">
              Kazanan:{' '}
              <strong className="text-white font-extrabold text-xl">
                {playerView.players[playerView.winner]?.name}
              </strong>{' '}
              (7 Zafer Puanı)
            </p>
            <button
              onClick={handleLeaveRoom}
              className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-base shadow-lg transition"
            >
              Lobiye Dön
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
