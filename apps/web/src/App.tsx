import React, { useEffect, useState } from 'react';
import {
  type Action,
  type PlayerView,
} from '@catankard/engine';
import { CardModal } from './components/CardModal.tsx';
import { CharityModal } from './components/CharityModal.tsx';
import { GameDesk3P } from './components/GameDesk3P.tsx';
import { GameDesk4P } from './components/GameDesk4P.tsx';
import { Lobby } from './components/Lobby.tsx';
import { RobberModal } from './components/RobberModal.tsx';
import { TradeModal } from './components/TradeModal.tsx';
import { getCardDetails, type CardDetails } from './lib/cardImages.ts';
import { ensureAnonymousAuth, invokeEdgeFunction, supabase } from './lib/supabase.ts';
import { useFullscreen } from './lib/useFullscreen.ts';

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
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [isPortraitMode, setIsPortraitMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 && window.innerHeight > window.innerWidth;
  });
  const [bypassPortraitWarning, setBypassPortraitWarning] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
      setIsPortraitMode(isPortrait);
    };
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

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
          if (payload.new) {
            const nextRoom: any = payload.new;
            setRoom(nextRoom);
            if (nextRoom.status === 'playing') {
              invokeEdgeFunction<{ ok: boolean; view?: PlayerView }>('heartbeat', { roomId })
                .then((res) => {
                  if (res.view) setPlayerView(res.view);
                })
                .catch(() => {});
            }
          }
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
    invokeEdgeFunction<{ ok: boolean; view?: PlayerView }>('heartbeat', { roomId })
      .then((res) => {
        if (res.view) setPlayerView(res.view);
      })
      .catch(() => {});

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(viewChannel);
    };
  }, [roomId, userId]);

  // 3. Heartbeat (Her 15 saniyede bir son görülme zamanını güncelle ve görünümü senkronize et)
  useEffect(() => {
    if (!roomId || !userId) return;

    const interval = setInterval(() => {
      invokeEdgeFunction<{ ok: boolean; view?: PlayerView }>('heartbeat', { roomId })
        .then((res) => {
          if (res.view) setPlayerView((prev) => prev ?? res.view!);
        })
        .catch(() => {});
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
    <div className={`relative w-full h-full min-h-screen ${isGameActive ? 'overflow-hidden' : 'overflow-y-auto bg-slate-950'}`}>
      {/* Olay Bildirimi Banner'ı */}
      {eventNotification && (
        <div className="fixed top-7 lg:top-14 left-1/2 transform -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-black px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-amber-300 animate-in slide-in-from-top duration-300 flex items-center gap-2.5 max-w-xl text-center">
          <span className="text-xs sm:text-sm md:text-base">{eventNotification}</span>
          <button
            onClick={() => setEventNotification(null)}
            className="text-xs bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 px-2 py-0.5 rounded-lg font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mobil Dikey Mod Engeli & Yatay Mod Yönlendirmesi */}
      {isGameActive && isPortraitMode && !bypassPortraitWarning && (
        <div className="fixed inset-0 z-50 bg-[#150103] flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-lg animate-in fade-in">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl border-2 border-amber-500/60 bg-amber-950/40 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.35)] animate-pulse">
              <span className="text-4xl">📱</span>
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg animate-bounce shadow-md">
              🔄
            </div>
          </div>
          <h2 className="text-xl font-black text-amber-400 mb-2 tracking-wide uppercase">
            Cihazınızı Yatay Çevirin
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xs leading-relaxed mb-6">
            CATAN – On the Road geniş masa ve büyük kartlar için <strong>yatay ekranda</strong> oynanır.
          </p>
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-lg hover:brightness-110 text-xs transition"
            >
              <span>⛶ Tam Ekran Yap ve Çevir</span>
            </button>
            <button
              type="button"
              onClick={() => setBypassPortraitWarning(true)}
              className="text-[11px] text-slate-500 hover:text-slate-300 underline transition py-1"
            >
              Yine de dikey devam et
            </button>
          </div>
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
          roomId={roomId}
          view={playerView}
          isTableVisible={!isPortraitMode || bypassPortraitWarning}
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
          roomId={roomId}
          view={playerView}
          isTableVisible={!isPortraitMode || bypassPortraitWarning}
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
