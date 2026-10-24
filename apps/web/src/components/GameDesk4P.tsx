import React, { useState, useEffect } from 'react';
import {
  Clock,
  LogOut,
} from 'lucide-react';
import type { BuildingCard, MetropolisCard, PlayerView, Resource } from '@catankard/engine';
import { BuildingRowMat } from './BuildingRowMat.tsx';
import { CardStack } from './CardStack.tsx';
import { TableCard } from './TableCard.tsx';
import { FannedHand } from './FannedHand.tsx';
import { GameMat } from './GameMat.tsx';
import { PlayerNameplate } from './PlayerNameplate.tsx';
import { TimeWarningOverlay } from './TimeWarningOverlay.tsx';
import { TableActionButtons } from './TableActionButtons.tsx';
import { CardAnimationOverlay, GameOpeningCinematic } from './CardAnimations.tsx';
import { assetUrl } from '../lib/assetUrl.ts';
import { useCardAnimations, useLogAnimationListener } from '../lib/animationHooks.ts';
import { useRealtimeCardPositions } from '../lib/useRealtimeCardPositions.ts';
import { createSafeZoneClamper } from '../lib/safePlacementBoundary.ts';

const formatRemainingTime = (seconds: number): string => {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
};

interface GameDesk4PProps {
  roomId?: string | null;
  view: PlayerView;
  onInspectCard: (type: any, subKind?: any) => void;
  onOpenTrade: () => void;
  onEndTurn: () => Promise<void>;
  onBuild: (
    cardId: string,
    source: 'row' | 'metropolis',
    onStackId?: string,
    substitution?: { replace: Resource; pay: Resource }
  ) => Promise<void>;
  onLeaveGame: () => void;
}

export const GameDesk4P: React.FC<GameDesk4PProps> = ({
  roomId,
  view,
  onInspectCard,
  onOpenTrade,
  onEndTurn,
  onBuild,
  onLeaveGame,
}) => {
  const [selectedStackId, setSelectedStackId] = useState<string | null>(null);

  const [pendingUpgrade, setPendingUpgrade] = useState<{
    cardId: string;
    source: 'row' | 'metropolis';
    type: 'city' | 'metropolis';
    substitution?: { replace: Resource; pay: Resource };
  } | null>(null);

  // Masadaki tüm kartların serbestçe sürüklenip bırakılması ve canlı senkronizasyonu
  const {
    positions: cardPositions,
    positionsByPlayer,
    updatePosition: updateCardPosition,
    broadcastCardPosition,
  } = useRealtimeCardPositions({
    roomId,
    playerId: view.you,
    legacyStorageKey: 'catankard_4p_card_positions',
  });

  const [, setIsCardDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  // Kart Uçuş ve Masa Darbe Animasyonları
  const {
    flyingCards,
    impacts,
    spawnFlight,
    spawnImpact,
  } = useCardAnimations();

  // Oyun Başlangıç Açılış Sinematiği (Kart karılması & dağıtımı)
  const [showOpeningCinematic, setShowOpeningCinematic] = useState<boolean>(() => {
    return view.turnNumber === 1 && !sessionStorage.getItem(`catankard_opened_${view.turnOrder.join('_')}`);
  });

  const handleFinishOpening = () => {
    sessionStorage.setItem(`catankard_opened_${view.turnOrder.join('_')}`, '1');
    setShowOpeningCinematic(false);
  };

  // Log Akışından Otomatik Animasyon Tetikleme (Hasat kart çekimi & İnşa etme darbeleri)
  useLogAnimationListener({
    recentLog: view.recentLog,
    youPlayerId: view.you,
    onDrawCard: (pid) => {
      const isMe = pid === view.you;
      spawnFlight({
        startX: window.innerWidth * 0.38,
        startY: window.innerHeight * 0.5,
        endX: isMe ? window.innerWidth * 0.75 : window.innerWidth * 0.25,
        endY: isMe ? window.innerHeight * 0.82 : window.innerHeight * 0.22,
        scale: 0.95,
        durationMs: 580,
        cardBackUrl: assetUrl('/assets/cards/resource/resource_back.png'),
      });
    },
    onPlayCard: (pid, cardType) => {
      const isMe = pid === view.you;
      spawnImpact({
        x: isMe ? window.innerWidth * 0.65 : window.innerWidth * 0.35,
        y: isMe ? window.innerHeight * 0.7 : window.innerHeight * 0.35,
        color: '#38bdf8',
        label: `${cardType.toUpperCase()} İNŞA EDİLDİ`,
      });
    },
  });

  const isActive = view.activePlayerId === view.you && view.phase === 'action';
  const opponents = view.turnOrder.filter((id) => id !== view.you);
  const opp1 = opponents[0]; // Sol Üst Kadran
  const opp2 = opponents[1]; // Sağ Üst Kadran
  const opp3 = opponents[2]; // Sol Alt Kadran

  // Canlı Geri Sayım (turnDeadline bazlı 1s interval ile güncellenir)
  const calculateRemaining = () => {
    return view.turnDeadline
      ? Math.max(0, Math.round((view.turnDeadline - Date.now()) / 1000))
      : null;
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(calculateRemaining);

  useEffect(() => {
    setRemainingSeconds(calculateRemaining());

    if (!view.turnDeadline) return;

    const interval = setInterval(() => {
      setRemainingSeconds(calculateRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [view.turnDeadline, view.activePlayerId]);

  // Aktif oyuncu kendisi ise ve süre 10 saniye veya daha azsa uyarı ver
  const isTimeWarning =
    view.activePlayerId === view.you &&
    remainingSeconds !== null &&
    remainingSeconds <= 10 &&
    remainingSeconds > 0;

  const handleSelectBuild = async (card: BuildingCard | MetropolisCard, source: 'row' | 'metropolis') => {
    if (!isActive) return;
    const cardType = source === 'row' ? (card as BuildingCard).type : 'metropolis';

    if (cardType === 'city' || cardType === 'metropolis') {
      // Doğrudan yükseltme moduna geç (Hiçbir modal veya "İnşa Et" butonu çıkmaz)
      setPendingUpgrade({
        cardId: card.id,
        source,
        type: cardType,
      });
      return;
    }

    // Yol, Şövalye, Köy: Doğrudan inşa et
    try {
      setLoading(true);
      await onBuild(card.id, source);
      spawnImpact({
        x: window.innerWidth * 0.65,
        y: window.innerHeight * 0.75,
        color: '#38bdf8',
        label: 'İnşa Edildi!',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpgrade = async (stackId: string) => {
    if (!pendingUpgrade) return;
    try {
      setLoading(true);
      await onBuild(
        pendingUpgrade.cardId,
        pendingUpgrade.source,
        stackId,
        pendingUpgrade.substitution
      );
      spawnImpact({
        x: window.innerWidth * 0.65,
        y: window.innerHeight * 0.75,
        color: '#eab308',
        label: `${pendingUpgrade.type === 'city' ? 'ŞEHİR' : 'BÜYÜKŞEHİR'} YÜKSELTİLDİ!`,
      });
      setPendingUpgrade(null);
      setSelectedStackId(null);
    } finally {
      setLoading(false);
    }
  };

  // Aktif Oyuncunun Bilgileri
  const youPlayer = view.players[view.you];
  const youArea = youPlayer?.area;
  const youRoadsCount = Math.max(1, youArea?.roads ?? 1);
  const youKnightsCount = youArea?.knights ?? 0;
  const youHasRoute = view.longestRouteOwner === view.you;
  const youHasArmy = view.largestArmyOwner === view.you;

  // Rakiplerin Bilgileri
  const opp1Area = opp1 ? view.players[opp1]?.area : null;
  const opp1RoadsCount = Math.max(1, opp1Area?.roads ?? 1);
  const opp1KnightsCount = opp1Area?.knights ?? 0;
  const opp1HasRoute = opp1 ? view.longestRouteOwner === opp1 : false;
  const opp1HasArmy = opp1 ? view.largestArmyOwner === opp1 : false;

  const opp2Area = opp2 ? view.players[opp2]?.area : null;
  const opp2RoadsCount = Math.max(1, opp2Area?.roads ?? 1);
  const opp2KnightsCount = opp2Area?.knights ?? 0;
  const opp2HasRoute = opp2 ? view.longestRouteOwner === opp2 : false;
  const opp2HasArmy = opp2 ? view.largestArmyOwner === opp2 : false;

  const opp3Area = opp3 ? view.players[opp3]?.area : null;
  const opp3RoadsCount = Math.max(1, opp3Area?.roads ?? 1);
  const opp3KnightsCount = opp3Area?.knights ?? 0;
  const opp3HasRoute = opp3 ? view.longestRouteOwner === opp3 : false;
  const opp3HasArmy = opp3 ? view.largestArmyOwner === opp3 : false;

  const totalYouCards =
    (youArea?.stacks.length ?? 1) +
    youRoadsCount +
    youKnightsCount +
    (youHasRoute ? 1 : 0) +
    (youHasArmy ? 1 : 0);

  return (
    <div className="relative w-full h-screen min-h-screen flex flex-col justify-between overflow-hidden">
      {/* Son 10 Saniye Kırmızı Uyarı Çerçevesi & Vinyet Efekti */}
      <TimeWarningOverlay
        isActive={isActive}
        remainingSeconds={remainingSeconds}
      />

      {/* 1. ÜST YÜZEN MINIMAL OYUN BARI */}
      <header className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl bg-slate-950/85 backdrop-blur-md border border-slate-700/60 rounded-2xl px-4 py-2 shadow-2xl flex items-center justify-between transition-all">
        {/* Sol: Tur & Sıra */}
        <div className="flex items-center gap-3">
          <span className="font-black text-amber-500 text-sm tracking-wider uppercase hidden sm:inline">
            Catan 4P • On the Road
          </span>
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-full text-xs">
            <span className="text-slate-400">Tur #{view.turnNumber}</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5 font-bold">
              <span
                className={`w-2 h-2 rounded-full ${
                  isActive ? 'bg-sky-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className={isActive ? 'text-sky-300' : 'text-amber-300'}>
                {view.players[view.activePlayerId]?.name || 'Oyuncu'}
              </span>
            </span>
          </div>
        </div>

        {/* Orta: Skor Tablosu (Tüm 4 Oyuncu) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {view.turnOrder.map((pid) => {
            const p = view.players[pid];
            if (!p) return null;
            const isTurn = view.activePlayerId === pid;
            const isMe = view.you === pid;
            const hasRoute = view.longestRouteOwner === pid;
            const hasArmy = view.largestArmyOwner === pid;

            return (
              <div
                key={pid}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs transition-all ${
                  isTurn
                    ? 'border-sky-400/90 bg-sky-950/80 text-sky-200 ring-2 ring-sky-400/50 shadow-[0_0_15px_rgba(56,189,248,0.5)] font-bold'
                    : 'border-slate-800 bg-slate-900/70 text-slate-300'
                }`}
              >
                <span className="truncate max-w-[70px]">
                  {isMe ? 'Sen' : p.name}
                </span>
                <span className="font-black text-yellow-400 bg-black/40 px-1.5 py-0.2 rounded-md">
                  {p.visibleVP} ZP
                </span>
                {hasRoute && <span title="En Uzun Yol (+2 ZP)">🛣️</span>}
                {hasArmy && <span title="En Güçlü Ordu (+2 ZP)">⚔️</span>}
              </div>
            );
          })}
        </div>

        {/* Sağ: Zamanlayıcı & Masadan Ayrıl */}
        <div className="flex items-center gap-2">
          {remainingSeconds !== null && (
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                remainingSeconds <= 10
                  ? 'border-red-500 bg-red-950/90 text-red-200 animate-pulse ring-2 ring-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.6)]'
                  : remainingSeconds <= 15
                  ? 'border-red-500 bg-red-950/80 text-red-300 animate-pulse'
                  : 'border-amber-600/50 bg-slate-900 text-amber-400'
              }`}
            >
              <Clock size={13} />
              <span>{formatRemainingTime(remainingSeconds)}</span>
            </div>
          )}

          <button
            onClick={onLeaveGame}
            title="Masadan Ayrıl"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 transition border border-slate-800"
          >
            <LogOut size={15} />
            <span className="hidden md:inline">Ayrıl</span>
          </button>
        </div>
      </header>

      {/* Yükseltme Bildirim Çubuğu */}
      {pendingUpgrade && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-sky-950/95 border border-sky-400/80 rounded-xl px-4 py-1.5 shadow-2xl flex items-center gap-3 animate-in fade-in">
          <span className="text-xs font-bold text-sky-200">
            {pendingUpgrade.type === 'city' ? 'Köy' : 'Şehir'} seçin
          </span>
          <button
            onClick={() => setPendingUpgrade(null)}
            className="text-xs bg-black/50 hover:bg-black text-slate-300 px-2 py-0.5 rounded border border-white/20 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. OYUN MATI (4 EKSENLİ KIRMIZI KADİFE ZEMİN) */}
      <GameMat playerCount={4}>
        {/* Üst Kadranlar (Sol Üst: Opp1, Sağ Üst: Opp2) */}
        <div className="w-full grid grid-cols-2 gap-4 pt-10">
          {/* Sol Üst Kadran: Opp1 */}
          {opp1 && (
            <div className="flex flex-col items-start gap-1 relative p-1 transition-all duration-300">
              <div className="flex items-start gap-3">
                {/* Rakip 1 Eli & İsim Etiketi */}
                <div className="flex flex-col items-start">
                  <FannedHand
                    cardCount={view.players[opp1]?.handCount ?? 0}
                    isCurrentPlayer={false}
                    corner="top-left"
                    scale={0.78}
                  />
                  <PlayerNameplate
                    name={view.players[opp1]?.name || 'Oyuncu'}
                    isTurn={view.activePlayerId === opp1}
                    victoryPoints={view.players[opp1]?.visibleVP ?? 0}
                    hasLongestRoute={opp1HasRoute}
                    hasLargestArmy={opp1HasArmy}
                    cardCount={view.players[opp1]?.handCount}
                    align="left"
                    className="mt-1"
                  />
                </div>

                {/* Rakip 1 Masadaki Fiziksel Kartları (Köy, Yol, Şövalye, Bonus) */}
                <div className="flex flex-wrap gap-2 items-end max-w-[320px] pt-1">
                  {/* Settlement Stacks */}
                  {opp1Area?.stacks.map((stack) => (
                    <CardStack
                      key={stack.id}
                      stack={stack}
                      onInspectCard={onInspectCard}
                      scale={1.0}
                      baseWidth={125}
                      baseHeight={194}
                      position={positionsByPlayer[opp1]?.[stack.id]}
                    />
                  ))}

                  {/* Road Cards */}
                  {Array.from({ length: opp1RoadsCount }).map((_, i) => {
                    const cardId = `${opp1}-road-${i}`;
                    return (
                      <TableCard
                        key={cardId}
                        id={cardId}
                        type="road"
                        isStarting={i === 0}
                        scale={1.0}
                        baseWidth={125}
                        baseHeight={194}
                        position={positionsByPlayer[opp1]?.[cardId]}
                        onInspect={() => onInspectCard('road')}
                      />
                    );
                  })}

                  {/* Knight Cards */}
                  {Array.from({ length: opp1KnightsCount }).map((_, i) => {
                    const cardId = `${opp1}-knight-${i}`;
                    return (
                      <TableCard
                        key={cardId}
                        id={cardId}
                        type="knight"
                        scale={1.0}
                        baseWidth={125}
                        baseHeight={194}
                        position={positionsByPlayer[opp1]?.[cardId]}
                        onInspect={() => onInspectCard('knight')}
                      />
                    );
                  })}

                  {/* Bonus Cards */}
                  {opp1HasRoute && (
                    <TableCard
                      key={`${opp1}-bonus-longest-route`}
                      id={`${opp1}-bonus-longest-route`}
                      type="longest_route"
                      scale={1.0}
                      baseWidth={186}
                      baseHeight={120}
                      position={positionsByPlayer[opp1]?.[`${opp1}-bonus-longest-route`]}
                      onInspect={() => onInspectCard('longest_route')}
                    />
                  )}
                  {opp1HasArmy && (
                    <TableCard
                      key={`${opp1}-bonus-largest-army`}
                      id={`${opp1}-bonus-largest-army`}
                      type="largest_army"
                      scale={1.0}
                      baseWidth={186}
                      baseHeight={120}
                      position={positionsByPlayer[opp1]?.[`${opp1}-bonus-largest-army`]}
                      onInspect={() => onInspectCard('largest_army')}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sağ Üst Kadran: Opp2 */}
          {opp2 && (
            <div className="flex flex-col items-end gap-1 relative p-1 transition-all duration-300">
              <div className="flex items-start gap-3 flex-row-reverse">
                {/* Rakip 2 Eli & İsim Etiketi */}
                <div className="flex flex-col items-end">
                  <FannedHand
                    cardCount={view.players[opp2]?.handCount ?? 0}
                    isCurrentPlayer={false}
                    corner="top-right"
                    scale={0.78}
                  />
                  <PlayerNameplate
                    name={view.players[opp2]?.name || 'Oyuncu'}
                    isTurn={view.activePlayerId === opp2}
                    victoryPoints={view.players[opp2]?.visibleVP ?? 0}
                    hasLongestRoute={opp2HasRoute}
                    hasLargestArmy={opp2HasArmy}
                    cardCount={view.players[opp2]?.handCount}
                    align="right"
                    className="mt-1"
                  />
                </div>

                {/* Rakip 2 Masadaki Fiziksel Kartları */}
                <div className="flex flex-wrap gap-2 items-end justify-end max-w-[340px] pt-1">
                  {opp2Area?.stacks.map((stack) => (
                    <CardStack
                      key={stack.id}
                      stack={stack}
                      onInspectCard={onInspectCard}
                      scale={1.0}
                      baseWidth={125}
                      baseHeight={194}
                      position={positionsByPlayer[opp2]?.[stack.id]}
                    />
                  ))}

                  {Array.from({ length: opp2RoadsCount }).map((_, i) => {
                    const cardId = `${opp2}-road-${i}`;
                    return (
                      <TableCard
                        key={cardId}
                        id={cardId}
                        type="road"
                        isStarting={i === 0}
                        scale={1.0}
                        baseWidth={125}
                        baseHeight={194}
                        position={positionsByPlayer[opp2]?.[cardId]}
                        onInspect={() => onInspectCard('road')}
                      />
                    );
                  })}

                  {Array.from({ length: opp2KnightsCount }).map((_, i) => {
                    const cardId = `${opp2}-knight-${i}`;
                    return (
                      <TableCard
                        key={cardId}
                        id={cardId}
                        type="knight"
                        scale={1.0}
                        baseWidth={125}
                        baseHeight={194}
                        position={positionsByPlayer[opp2]?.[cardId]}
                        onInspect={() => onInspectCard('knight')}
                      />
                    );
                  })}

                  {opp2HasRoute && (
                    <TableCard
                      key={`${opp2}-bonus-longest-route`}
                      id={`${opp2}-bonus-longest-route`}
                      type="longest_route"
                      scale={1.0}
                      baseWidth={186}
                      baseHeight={120}
                      position={positionsByPlayer[opp2]?.[`${opp2}-bonus-longest-route`]}
                      onInspect={() => onInspectCard('longest_route')}
                    />
                  )}
                  {opp2HasArmy && (
                    <TableCard
                      key={`${opp2}-bonus-largest-army`}
                      id={`${opp2}-bonus-largest-army`}
                      type="largest_army"
                      scale={1.0}
                      baseWidth={186}
                      baseHeight={120}
                      position={positionsByPlayer[opp2]?.[`${opp2}-bonus-largest-army`]}
                      onInspect={() => onInspectCard('largest_army')}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Orta Alan: BUILDING ROW MAT (Masanın Tam Fiziksel Merkezinde) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto">
          <BuildingRowMat
            view={view}
            onInspectCard={onInspectCard}
            onSelectBuild={handleSelectBuild}
            canBuildMetropolis={isActive}
            scale={0.98}
          />
        </div>

        {/* Alt Kadranlar (Sol Alt: Opp3, Sağ Alt: SEN / Aktif Oyuncu) */}
        <div className="w-full grid grid-cols-2 gap-4 pb-3 sm:pb-4">
          {/* Sol Alt Kadran: Opp3 */}
          {opp3 ? (
            <div className="flex flex-col items-start gap-1 relative justify-end p-1 transition-all duration-300">
              <div className="flex items-end gap-3">
                {/* Rakip 3 Eli & İsim Etiketi */}
                <div className="flex flex-col items-start">
                  <FannedHand
                    cardCount={view.players[opp3]?.handCount ?? 0}
                    isCurrentPlayer={false}
                    corner="bottom-left"
                    scale={0.78}
                  />
                  <PlayerNameplate
                    name={view.players[opp3]?.name || 'Oyuncu'}
                    isTurn={view.activePlayerId === opp3}
                    victoryPoints={view.players[opp3]?.visibleVP ?? 0}
                    hasLongestRoute={opp3HasRoute}
                    hasLargestArmy={opp3HasArmy}
                    cardCount={view.players[opp3]?.handCount}
                    align="left"
                    className="mt-1"
                  />
                </div>

                {/* Rakip 3 Masadaki Fiziksel Kartları */}
                <div className="flex flex-wrap gap-2 items-end max-w-[340px]">
                  {opp3Area?.stacks.map((stack) => (
                    <CardStack
                      key={stack.id}
                      stack={stack}
                      onInspectCard={onInspectCard}
                      scale={1.0}
                      baseWidth={125}
                      baseHeight={194}
                      position={positionsByPlayer[opp3]?.[stack.id]}
                    />
                  ))}

                  {Array.from({ length: opp3RoadsCount }).map((_, i) => {
                    const cardId = `${opp3}-road-${i}`;
                    return (
                      <TableCard
                        key={cardId}
                        id={cardId}
                        type="road"
                        isStarting={i === 0}
                        scale={1.0}
                        baseWidth={125}
                        baseHeight={194}
                        position={positionsByPlayer[opp3]?.[cardId]}
                        onInspect={() => onInspectCard('road')}
                      />
                    );
                  })}

                  {Array.from({ length: opp3KnightsCount }).map((_, i) => {
                    const cardId = `${opp3}-knight-${i}`;
                    return (
                      <TableCard
                        key={cardId}
                        id={cardId}
                        type="knight"
                        scale={1.0}
                        baseWidth={125}
                        baseHeight={194}
                        position={positionsByPlayer[opp3]?.[cardId]}
                        onInspect={() => onInspectCard('knight')}
                      />
                    );
                  })}

                  {opp3HasRoute && (
                    <TableCard
                      key={`${opp3}-bonus-longest-route`}
                      id={`${opp3}-bonus-longest-route`}
                      type="longest_route"
                      scale={1.0}
                      baseWidth={186}
                      baseHeight={120}
                      position={positionsByPlayer[opp3]?.[`${opp3}-bonus-longest-route`]}
                      onInspect={() => onInspectCard('longest_route')}
                    />
                  )}
                  {opp3HasArmy && (
                    <TableCard
                      key={`${opp3}-bonus-largest-army`}
                      id={`${opp3}-bonus-largest-army`}
                      type="largest_army"
                      scale={1.0}
                      baseWidth={186}
                      baseHeight={120}
                      position={positionsByPlayer[opp3]?.[`${opp3}-bonus-largest-army`]}
                      onInspect={() => onInspectCard('largest_army')}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* Sağ Alt Kadran: SENİN MASAN (Sürükleme Alanı & Kaynak Kartları) */}
          <div className="flex items-end justify-between gap-4 lg:gap-8 relative p-1 transition-all duration-300 pb-1 w-full pl-6 sm:pl-10 lg:pl-14">
            {/* 1. Masadaki Fiziksel Kartlar (Görünmez alan, kaynak kartlarının solunda serbestçe sürüklenebilir) */}
            <div className="relative z-20 shrink-0">
              <div className="flex flex-wrap gap-2.5 items-end justify-start max-w-sm sm:max-w-md">
              {/* Yerleşim Yığınları */}
              {youArea?.stacks.map((stack, index) => {
                const isSettlement = stack.top === 'settlement';
                const isCity = stack.top === 'city';

                const canSelectForCity = pendingUpgrade?.type === 'city' && isSettlement;
                const canSelectForMetro = pendingUpgrade?.type === 'metropolis' && isCity;
                const isSelectable = Boolean(canSelectForCity || canSelectForMetro);
                const isSelected = selectedStackId === stack.id;

                const clampFn = createSafeZoneClamper({
                  layout: '4P',
                  handPosition: 'bottom-right',
                  slotIndex: index,
                  totalSlots: totalYouCards,
                  cardWidth: 120,
                });

                return (
                  <CardStack
                    key={stack.id}
                    stack={stack}
                    isSelectable={isSelectable}
                    isSelected={isSelected}
                    onSelect={handleConfirmUpgrade}
                    onInspectCard={onInspectCard}
                    scale={1.0}
                    baseWidth={125}
                    baseHeight={194}
                    isDraggable={true}
                    position={cardPositions[stack.id]}
                    onPositionChange={(pos) => updateCardPosition(stack.id, pos)}
                    onDragMove={(pos) => broadcastCardPosition(stack.id, pos)}
                    onDragChange={setIsCardDragging}
                    clampPosition={clampFn}
                  />
                );
              })}

              {/* Road Cards */}
              {Array.from({ length: youRoadsCount }).map((_, i) => {
                const cardId = `${view.you}-road-${i}`;
                const slotIdx = (youArea?.stacks.length ?? 1) + i;
                const clampFn = createSafeZoneClamper({
                  layout: '4P',
                  handPosition: 'bottom-right',
                  slotIndex: slotIdx,
                  totalSlots: totalYouCards,
                  cardWidth: 125,
                });

                return (
                  <TableCard
                    key={cardId}
                    id={cardId}
                    type="road"
                    isStarting={i === 0}
                    scale={1.0}
                    baseWidth={125}
                    baseHeight={194}
                    isDraggable={true}
                    position={cardPositions[cardId] || cardPositions[`you-4p-road-${i}`]}
                    onPositionChange={(pos) => updateCardPosition(cardId, pos)}
                    onDragMove={(pos) => broadcastCardPosition(cardId, pos)}
                    onDragChange={setIsCardDragging}
                    clampPosition={clampFn}
                    onInspect={() => onInspectCard('road')}
                  />
                );
              })}

              {/* Knight Cards */}
              {Array.from({ length: youKnightsCount }).map((_, i) => {
                const cardId = `${view.you}-knight-${i}`;
                const slotIdx = (youArea?.stacks.length ?? 1) + youRoadsCount + i;
                const clampFn = createSafeZoneClamper({
                  layout: '4P',
                  handPosition: 'bottom-right',
                  slotIndex: slotIdx,
                  totalSlots: totalYouCards,
                  cardWidth: 125,
                });

                return (
                  <TableCard
                    key={cardId}
                    id={cardId}
                    type="knight"
                    scale={1.0}
                    baseWidth={125}
                    baseHeight={194}
                    isDraggable={true}
                    position={cardPositions[cardId] || cardPositions[`you-4p-knight-${i}`]}
                    onPositionChange={(pos) => updateCardPosition(cardId, pos)}
                    onDragMove={(pos) => broadcastCardPosition(cardId, pos)}
                    onDragChange={setIsCardDragging}
                    clampPosition={clampFn}
                    onInspect={() => onInspectCard('knight')}
                  />
                );
              })}

              {/* Bonus Kartlar */}
              {youHasRoute && (
                <TableCard
                  key="bonus-4p-longest-route"
                  id={`${view.you}-bonus-longest-route`}
                  type="longest_route"
                  scale={1.0}
                  baseWidth={186}
                  baseHeight={120}
                  isDraggable={true}
                  position={
                    cardPositions[`${view.you}-bonus-longest-route`] ||
                    cardPositions['bonus-4p-longest-route']
                  }
                  onPositionChange={(pos) =>
                    updateCardPosition(`${view.you}-bonus-longest-route`, pos)
                  }
                  onDragMove={(pos) =>
                    broadcastCardPosition(`${view.you}-bonus-longest-route`, pos)
                  }
                  onDragChange={setIsCardDragging}
                  clampPosition={createSafeZoneClamper({
                    layout: '4P',
                    handPosition: 'bottom-right',
                    slotIndex:
                      (youArea?.stacks.length ?? 1) +
                      youRoadsCount +
                      youKnightsCount,
                    totalSlots: totalYouCards,
                    cardWidth: 186,
                  })}
                  onInspect={() => onInspectCard('longest_route')}
                />
              )}
              {youHasArmy && (
                <TableCard
                  key="bonus-4p-largest-army"
                  id={`${view.you}-bonus-largest-army`}
                  type="largest_army"
                  scale={1.0}
                  baseWidth={186}
                  baseHeight={120}
                  isDraggable={true}
                  position={
                    cardPositions[`${view.you}-bonus-largest-army`] ||
                    cardPositions['bonus-4p-largest-army']
                  }
                  onPositionChange={(pos) =>
                    updateCardPosition(`${view.you}-bonus-largest-army`, pos)
                  }
                  onDragMove={(pos) =>
                    broadcastCardPosition(`${view.you}-bonus-largest-army`, pos)
                  }
                  onDragChange={setIsCardDragging}
                  clampPosition={createSafeZoneClamper({
                    layout: '4P',
                    handPosition: 'bottom-right',
                    slotIndex:
                      (youArea?.stacks.length ?? 1) +
                      youRoadsCount +
                      youKnightsCount +
                      (youHasRoute ? 1 : 0),
                    totalSlots: totalYouCards,
                    cardWidth: 160,
                  })}
                  onInspect={() => onInspectCard('largest_army')}
                />
              )}
              </div>
            </div>

            {/* 2. Oyuncunun Elindeki Fiziksel Kaynak Yelpazesi & Altında İsim Plakası */}
            <div className="flex flex-col items-end z-10 shrink-0">
              <FannedHand
                hand={view.yourHand}
                isCurrentPlayer={true}
                corner="bottom-right"
                onInspectCard={onInspectCard}
                scale={0.95}
              />
              <PlayerNameplate
                name={youPlayer?.name || 'Sen'}
                isTurn={isActive}
                isMe={true}
                victoryPoints={youPlayer?.visibleVP ?? 0}
                hasLongestRoute={youHasRoute}
                hasLargestArmy={youHasArmy}
                cardCount={Object.values(view.yourHand ?? {}).reduce((a, b) => a + b, 0)}
                align="right"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </GameMat>

      {/* ALT AKSİYON BUTONLARI (4 Kişilik Oyunda Ortada: Ticaret & Turu Bitir) */}
      <TableActionButtons
        layout="4P"
        onOpenTrade={onOpenTrade}
        onEndTurn={onEndTurn}
        isActive={isActive}
        loading={loading}
        openTradeOffersCount={view.tradeOffers.filter((o) => o.status === 'open').length}
        activePlayerName={view.players[view.activePlayerId]?.name}
      />

      {/* Kart ve Masa Animasyonları Katmanı (Çekilen kartlar, uçuşlar, masa vuruşları) */}
      <CardAnimationOverlay flyingCards={flyingCards} impacts={impacts} />

      {/* Oyun Açılışı: Kart Karılması ve Dağıtımı Sinematiği */}
      <GameOpeningCinematic
        isOpen={showOpeningCinematic}
        view={view}
        onFinish={handleFinishOpening}
      />
    </div>
  );
};

export default GameDesk4P;
