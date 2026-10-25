import React, { useState, useEffect } from 'react';
import {
  Clock,
  LogOut,
  Maximize,
  Minimize,
} from 'lucide-react';
import type { BuildingCard, MetropolisCard, PlayerView, Resource } from '@catankard/engine';
import { BuildingRowMat } from './BuildingRowMat.tsx';
import { CardStack } from './CardStack.tsx';
import { TableCard } from './TableCard.tsx';
import { StackedTableCards } from './StackedTableCards.tsx';
import { FannedHand } from './FannedHand.tsx';
import { GameMat } from './GameMat.tsx';
import { PlayerNameplate } from './PlayerNameplate.tsx';
import { TimeWarningOverlay } from './TimeWarningOverlay.tsx';
import { TableActionButtons } from './TableActionButtons.tsx';
import { CardAnimationOverlay, GameOpeningCinematic } from './CardAnimations.tsx';
import { assetUrl } from '../lib/assetUrl.ts';
import { getBuildingSubstitutionInfo, RESOURCE_NAMES_TR } from '../lib/canAfford.ts';
import { useCardAnimations, useLogAnimationListener } from '../lib/animationHooks.ts';
import { useRealtimeCardPositions } from '../lib/useRealtimeCardPositions.ts';
import { createSafeZoneClamper } from '../lib/safePlacementBoundary.ts';
import { useResponsiveLayout } from '../lib/useResponsiveLayout.ts';
import { useFullscreen } from '../lib/useFullscreen.ts';

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
  isTableVisible?: boolean;
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
  isTableVisible = true,
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

  const [pendingSubstitution, setPendingSubstitution] = useState<{
    card: BuildingCard | MetropolisCard;
    source: 'row' | 'metropolis';
    neededResource: Resource;
    payOptions: Resource[];
    ratio: number;
  } | null>(null);

  const {
    isMobile,
    isMobilePortrait,
    marketScale,
    opponentCardScale,
    opponentHandScale,
    playerCardScale,
    playerHandScale,
  } = useResponsiveLayout();

  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const {
    positions: cardPositions,
    positionsByPlayer,
    cardZIndices,
    bringToFront,
    updatePosition: updateCardPosition,
    broadcastCardPosition,
  } = useRealtimeCardPositions({
    roomId,
    playerId: view.you,
    legacyStorageKey: 'catankard_4p_card_positions',
  });

  const [, setIsCardDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    flyingCards,
    impacts,
    spawnFlight,
    spawnImpact,
  } = useCardAnimations();

  const openingStorageKey = `catankard_opened_${view.turnOrder.join('_')}`;
  const [needsOpeningDeal] = useState<boolean>(() => {
    return view.turnNumber === 1 && !sessionStorage.getItem(openingStorageKey);
  });
  const [showOpeningCinematic, setShowOpeningCinematic] = useState<boolean>(false);
  const [tableCardsDealt, setTableCardsDealt] = useState<boolean>(() => !needsOpeningDeal);
  const [handCardsDealt, setHandCardsDealt] = useState<boolean>(() => !needsOpeningDeal);

  // Kullanıcı yatay çevirip masayı gördükten sonra kart dağıtma animasyonunu başlat
  useEffect(() => {
    if (!needsOpeningDeal) return;
    if (!isTableVisible) return;

    const timer = window.setTimeout(() => {
      setShowOpeningCinematic(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [needsOpeningDeal, isTableVisible]);

  const handleFinishOpening = () => {
    sessionStorage.setItem(openingStorageKey, '1');
    setTableCardsDealt(true);
    setHandCardsDealt(true);
    setShowOpeningCinematic(false);
  };

  // Log Akışından Otomatik Animasyon Tetikleme (Her çekilen kart için birebir kart uçuşu)
  useLogAnimationListener({
    recentLog: view.recentLog,
    youPlayerId: view.you,
    onDrawCard: (pid, count) => {
      const isMe = pid === view.you;
      const cardsToAnimate = Math.max(1, Math.min(count || 1, 6));
      for (let i = 0; i < cardsToAnimate; i++) {
        spawnFlight({
          startX: window.innerWidth * 0.2,
          startY: window.innerHeight * 0.5,
          endX: isMe ? window.innerWidth * 0.85 : window.innerWidth * 0.25,
          endY: isMe ? window.innerHeight * 0.82 : window.innerHeight * 0.22,
          scale: 0.92,
          durationMs: 520,
          delayMs: i * 140,
          cardBackUrl: assetUrl('/assets/cards/resource/resource_back.png'),
        });
      }
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

  const executeBuildWithSubstitution = async (
    card: BuildingCard | MetropolisCard,
    source: 'row' | 'metropolis',
    substitution?: { replace: Resource; pay: Resource }
  ) => {
    const cardType = source === 'row' ? (card as BuildingCard).type : 'metropolis';

    if (cardType === 'city' || cardType === 'metropolis') {
      setPendingUpgrade({
        cardId: card.id,
        source,
        type: cardType,
        substitution,
      });
      return;
    }

    try {
      setLoading(true);
      await onBuild(card.id, source, undefined, substitution);
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

  const handleSelectBuild = async (card: BuildingCard | MetropolisCard, source: 'row' | 'metropolis') => {
    if (!isActive) return;
    const cardType = source === 'row' ? (card as BuildingCard).type : 'metropolis';
    const roadsCount = view.players[view.you]?.area?.roads ?? 1;
    const subInfo = getBuildingSubstitutionInfo(
      cardType,
      view.yourHand,
      roadsCount,
      view.turnFlags.roadSubstitutionUsed
    );

    if (!subInfo.canAfford) return;

    if (subInfo.isDirectAfford) {
      setPendingSubstitution(null);
      await executeBuildWithSubstitution(card, source, undefined);
      return;
    }

    if (subInfo.neededResource && subInfo.payOptions.length === 1) {
      setPendingSubstitution(null);
      await executeBuildWithSubstitution(card, source, {
        replace: subInfo.neededResource,
        pay: subInfo.payOptions[0]!,
      });
      return;
    }

    if (subInfo.neededResource && subInfo.payOptions.length > 1) {
      setPendingUpgrade(null);
      setPendingSubstitution({
        card,
        source,
        neededResource: subInfo.neededResource,
        payOptions: subInfo.payOptions,
        ratio: subInfo.ratio,
      });
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

  const youPlayer = view.players[view.you];
  const youArea = youPlayer?.area;
  const youRoadsCount = Math.max(1, youArea?.roads ?? 1);
  const youKnightsCount = youArea?.knights ?? 0;
  const youHasRoute = view.longestRouteOwner === view.you;
  const youHasArmy = view.largestArmyOwner === view.you;

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

  // 4P mobil için oyuncunun yükseltmeye uygun hedef yığınını otomatik bulur
  const youStacks = youArea?.stacks ?? [];
  const upgradeTargetStack = pendingUpgrade
    ? youStacks.find((s) =>
        pendingUpgrade.type === 'city' ? s.top === 'settlement' : s.top === 'city'
      )
    : undefined;
  const primaryYouStack = upgradeTargetStack ?? youStacks[0];

  return (
    <div className="relative w-full h-screen min-h-screen flex flex-col justify-between overflow-hidden">
      <TimeWarningOverlay
        isActive={isActive}
        remainingSeconds={remainingSeconds}
      />

      {/* 1. ÜST TABLO BARI (PC'de Aynen Kalır, Mobilde Gizlenir) */}
      <header className={`${isMobile ? 'hidden' : 'flex'} fixed top-1 sm:top-2 left-1/2 -translate-x-1/2 z-50 w-[98%] max-w-6xl bg-slate-950/85 backdrop-blur-md border border-slate-700/60 rounded-xl sm:rounded-2xl px-2 sm:px-4 py-0.5 sm:py-2 shadow-2xl items-center justify-between transition-all`}>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <span className="font-black text-amber-500 text-xs sm:text-sm tracking-wider uppercase hidden sm:inline">
            Catan 4P • On the Road
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 border border-slate-800 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs">
            <span className="text-slate-400">Tur #{view.turnNumber}</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 font-bold">
              <span
                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                  isActive ? 'bg-sky-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className={`truncate max-w-[65px] sm:max-w-none ${isActive ? 'text-sky-300' : 'text-amber-300'}`}>
                {view.players[view.activePlayerId]?.name || 'Oyuncu'}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {view.turnOrder.map((pid) => {
            const p = view.players[pid];
            if (!p) return null;
            const isTurn = view.activePlayerId === pid;
            const isMe = view.you === pid;
            const hasRoute = view.longestRouteOwner === pid;
            const hasArmy = view.largestArmyOwner === pid;
            const cardCount = isMe
              ? Object.values(view.yourHand ?? {}).reduce((a, b) => a + b, 0)
              : p.handCount;

            return (
              <div
                key={pid}
                className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border text-[10px] sm:text-xs transition-all ${
                  isTurn
                    ? 'border-sky-400/90 bg-sky-950/80 text-sky-200 ring-1 sm:ring-2 ring-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.5)] font-bold'
                    : 'border-slate-800 bg-slate-900/70 text-slate-300'
                }`}
              >
                <span className="truncate max-w-[42px] sm:max-w-[70px]">
                  {isMe ? 'Sen' : p.name}
                </span>
                <span className="font-black text-yellow-400 bg-black/40 px-1 py-0.2 rounded-sm sm:rounded-md">
                  {p.visibleVP} ZP
                </span>
                {typeof cardCount === 'number' && (
                  <span className="text-[9px] text-slate-400 font-mono hidden xs:inline" title={`${cardCount} kart`}>
                    🎴{cardCount}
                  </span>
                )}
                {hasRoute && <span title="En Uzun Yol (+2 ZP)">🛣️</span>}
                {hasArmy && <span title="En Güçlü Ordu (+2 ZP)">⚔️</span>}
              </div>
            );
          })}
        </div>

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
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran (URL Çubuğunu Kapat)'}
            aria-label="Tam Ekran Modu"
            className="flex items-center gap-1 text-[11px] sm:text-xs text-amber-300 hover:text-white p-1 sm:p-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 transition border border-amber-600/50 shadow-sm"
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            <span className="hidden sm:inline">{isFullscreen ? 'Normal' : 'Tam Ekran'}</span>
          </button>

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

      {/* MOBİL İÇİN MİNİMALİST ÜST BİLGİ & KONTROL ROZETİ */}
      {isMobile && (
        <div className="fixed top-1 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-700/60 px-2.5 py-0.5 rounded-full text-[10px] shadow-lg pointer-events-auto">
          <span className="text-slate-400 font-medium">Tur #{view.turnNumber}</span>
          <span className="text-slate-600">•</span>
          <span className={`font-bold truncate max-w-[85px] ${isActive ? 'text-sky-300' : 'text-amber-300'}`}>
            {isActive ? 'Sende' : (view.players[view.activePlayerId]?.name || 'Bekleniyor')}
          </span>
          {remainingSeconds !== null && (
            <>
              <span className="text-slate-600">•</span>
              <span className={`font-bold flex items-center gap-0.5 ${remainingSeconds <= 10 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                <Clock size={10} />
                {formatRemainingTime(remainingSeconds)}
              </span>
            </>
          )}
          <div className="w-px h-3 bg-slate-700/60 mx-0.5" />
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
            className="text-amber-300 hover:text-white p-0.5 rounded"
          >
            {isFullscreen ? <Minimize size={12} /> : <Maximize size={12} />}
          </button>
          <button
            type="button"
            onClick={onLeaveGame}
            title="Masadan Ayrıl"
            className="text-slate-400 hover:text-red-400 p-0.5 rounded"
          >
            <LogOut size={12} />
          </button>
        </div>
      )}

      {/* Yol İkamesi Seçim Çubuğu */}
      {pendingSubstitution && (
        <div className={`fixed ${isMobile ? 'top-7' : 'top-14'} left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border border-amber-400/80 rounded-xl px-3 py-1.5 shadow-2xl flex items-center gap-2 animate-in fade-in`}>
          <span className="text-[11px] sm:text-xs font-bold text-amber-200 whitespace-nowrap">
            Yol İkamesi ({pendingSubstitution.ratio}:1) — Eksik {RESOURCE_NAMES_TR[pendingSubstitution.neededResource]} için ver:
          </span>
          <div className="flex items-center gap-1.5">
            {pendingSubstitution.payOptions.map((r) => (
              <button
                key={r}
                type="button"
                onClick={async () => {
                  const current = pendingSubstitution;
                  setPendingSubstitution(null);
                  await executeBuildWithSubstitution(current.card, current.source, {
                    replace: current.neededResource,
                    pay: r,
                  });
                }}
                className="text-[11px] sm:text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-lg transition shadow"
              >
                {pendingSubstitution.ratio}× {RESOURCE_NAMES_TR[r]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPendingSubstitution(null)}
            className="text-xs bg-black/50 hover:bg-black text-slate-300 px-2 py-0.5 rounded border border-white/20 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Yükseltme Bildirim Çubuğu */}
      {pendingUpgrade && (
        <div className={`fixed ${isMobile ? 'top-7' : 'top-14'} left-1/2 -translate-x-1/2 z-50 bg-sky-950/95 border border-sky-400/80 rounded-xl px-4 py-1.5 shadow-2xl flex items-center gap-3 animate-in fade-in`}>
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

      {/* 2. OYUN MATI (4 Kişilik Oyunda Masa Üstünde Kayarak Açılan Çekmece & Dar Sütun Düzeni) */}
      <GameMat playerCount={4}>
        {/* Üst Kadranlar (Sol Üst: Opp1, Sağ Üst: Opp2) */}
        <div className={`w-full grid grid-cols-2 gap-2 sm:gap-4 ${isMobile ? 'pt-1' : 'pt-1 sm:pt-10'}`}>
          {/* Sol Üst Kadran: Opp1 */}
          {opp1 && (
            <div className="flex flex-col items-start gap-1 relative p-1 transition-all duration-300">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex flex-col items-start">
                  <div className={`transition-opacity duration-300 ${handCardsDealt ? 'opacity-100' : 'opacity-0'}`}>
                    <FannedHand
                      cardCount={view.players[opp1]?.handCount ?? 0}
                      isCurrentPlayer={false}
                      corner="top-left"
                      scale={opponentHandScale}
                    />
                  </div>
                  <PlayerNameplate
                    name={view.players[opp1]?.name || 'Oyuncu'}
                    isTurn={view.activePlayerId === opp1}
                    victoryPoints={view.players[opp1]?.visibleVP ?? 0}
                    hasLongestRoute={opp1HasRoute}
                    hasLargestArmy={opp1HasArmy}
                    cardCount={view.players[opp1]?.handCount}
                    align="left"
                    compact={isMobilePortrait}
                    className="mt-0.5 sm:mt-1"
                  />
                </div>

                {/* Rakip 1 Masadaki Fiziksel Kartları (Üst rakipte çekmeceler aşağı doğru kayar) */}
                <div
                  className={`flex ${isMobile ? 'flex-nowrap gap-0.5' : 'flex-wrap gap-1 sm:gap-2 max-w-[200px] sm:max-w-[320px]'} items-start pt-1 transition-opacity duration-300 ${
                    tableCardsDealt ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {isMobile
                    ? opp1Area?.stacks?.[0] && (
                        <CardStack
                          key={opp1Area.stacks[0].id}
                          stack={opp1Area.stacks[0]}
                          allStacks={opp1Area.stacks}
                          folderMode={true}
                          drawerDirection="down"
                          onInspectCard={onInspectCard}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                        />
                      )
                    : opp1Area?.stacks.map((stack) => (
                        <CardStack
                          key={stack.id}
                          stack={stack}
                          onInspectCard={onInspectCard}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[opp1]?.[stack.id]}
                          zIndex={cardZIndices[stack.id]}
                        />
                      ))}

                  {isMobile ? (
                    <StackedTableCards
                      idPrefix={`${opp1}-roads`}
                      type="road"
                      count={opp1RoadsCount}
                      scale={opponentCardScale}
                      baseWidth={125}
                      baseHeight={194}
                      layerOffset={24}
                      folderMode={true}
                      drawerDirection="down"
                      isDraggable={false}
                      position={positionsByPlayer[opp1]?.[`${opp1}-road-0`]}
                      zIndex={cardZIndices[`${opp1}-road-0`]}
                      onInspect={() => onInspectCard('road')}
                    />
                  ) : (
                    Array.from({ length: opp1RoadsCount }).map((_, i) => {
                      const cardId = `${opp1}-road-${i}`;
                      return (
                        <TableCard
                          key={cardId}
                          id={cardId}
                          type="road"
                          isStarting={i === 0}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[opp1]?.[cardId]}
                          zIndex={cardZIndices[cardId]}
                          onInspect={() => onInspectCard('road')}
                        />
                      );
                    })
                  )}

                  {isMobile ? (
                    <StackedTableCards
                      idPrefix={`${opp1}-knights`}
                      type="knight"
                      count={opp1KnightsCount}
                      scale={opponentCardScale}
                      baseWidth={125}
                      baseHeight={194}
                      layerOffset={24}
                      folderMode={true}
                      drawerDirection="down"
                      isDraggable={false}
                      position={positionsByPlayer[opp1]?.[`${opp1}-knight-0`]}
                      zIndex={cardZIndices[`${opp1}-knight-0`]}
                      onInspect={() => onInspectCard('knight')}
                    />
                  ) : (
                    Array.from({ length: opp1KnightsCount }).map((_, i) => {
                      const cardId = `${opp1}-knight-${i}`;
                      return (
                        <TableCard
                          key={cardId}
                          id={cardId}
                          type="knight"
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[opp1]?.[cardId]}
                          zIndex={cardZIndices[cardId]}
                          onInspect={() => onInspectCard('knight')}
                        />
                      );
                    })
                  )}

                  {/* Bonus Kartlar: Mobilde tek dar sütunda üst üste dizilir */}
                  {(opp1HasRoute || opp1HasArmy) && (
                    <div className={isMobile ? 'flex flex-col gap-0.5 items-start' : 'flex gap-1 items-end'}>
                      {opp1HasRoute && (
                        <TableCard
                          key={`${opp1}-bonus-longest-route`}
                          id={`${opp1}-bonus-longest-route`}
                          type="longest_route"
                          scale={opponentCardScale}
                          baseWidth={186}
                          baseHeight={120}
                          folderMode={isMobile}
                          drawerDirection="down"
                          position={positionsByPlayer[opp1]?.[`${opp1}-bonus-longest-route`]}
                          zIndex={cardZIndices[`${opp1}-bonus-longest-route`]}
                          onInspect={() => onInspectCard('longest_route')}
                        />
                      )}
                      {opp1HasArmy && (
                        <TableCard
                          key={`${opp1}-bonus-largest-army`}
                          id={`${opp1}-bonus-largest-army`}
                          type="largest_army"
                          scale={opponentCardScale}
                          baseWidth={186}
                          baseHeight={120}
                          folderMode={isMobile}
                          drawerDirection="down"
                          position={positionsByPlayer[opp1]?.[`${opp1}-bonus-largest-army`]}
                          zIndex={cardZIndices[`${opp1}-bonus-largest-army`]}
                          onInspect={() => onInspectCard('largest_army')}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sağ Üst Kadran: Opp2 */}
          {opp2 && (
            <div className="flex flex-col items-end gap-1 relative p-1 transition-all duration-300">
              <div className="flex items-start gap-2 sm:gap-3 flex-row-reverse">
                <div className="flex flex-col items-end">
                  <div className={`transition-opacity duration-300 ${handCardsDealt ? 'opacity-100' : 'opacity-0'}`}>
                    <FannedHand
                      cardCount={view.players[opp2]?.handCount ?? 0}
                      isCurrentPlayer={false}
                      corner="top-right"
                      scale={opponentHandScale}
                    />
                  </div>
                  <PlayerNameplate
                    name={view.players[opp2]?.name || 'Oyuncu'}
                    isTurn={view.activePlayerId === opp2}
                    victoryPoints={view.players[opp2]?.visibleVP ?? 0}
                    hasLongestRoute={opp2HasRoute}
                    hasLargestArmy={opp2HasArmy}
                    cardCount={view.players[opp2]?.handCount}
                    align="right"
                    compact={isMobilePortrait}
                    className="mt-0.5 sm:mt-1"
                  />
                </div>

                {/* Rakip 2 Masadaki Fiziksel Kartları */}
                <div
                  className={`flex ${isMobile ? 'flex-nowrap gap-0.5' : 'flex-wrap gap-1 sm:gap-2 max-w-[200px] sm:max-w-[340px]'} items-start justify-end pt-1 transition-opacity duration-300 ${
                    tableCardsDealt ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {isMobile
                    ? opp2Area?.stacks?.[0] && (
                        <CardStack
                          key={opp2Area.stacks[0].id}
                          stack={opp2Area.stacks[0]}
                          allStacks={opp2Area.stacks}
                          folderMode={true}
                          drawerDirection="down"
                          onInspectCard={onInspectCard}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                        />
                      )
                    : opp2Area?.stacks.map((stack) => (
                        <CardStack
                          key={stack.id}
                          stack={stack}
                          onInspectCard={onInspectCard}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[opp2]?.[stack.id]}
                          zIndex={cardZIndices[stack.id]}
                        />
                      ))}

                  {isMobile ? (
                    <StackedTableCards
                      idPrefix={`${opp2}-roads`}
                      type="road"
                      count={opp2RoadsCount}
                      scale={opponentCardScale}
                      baseWidth={125}
                      baseHeight={194}
                      layerOffset={24}
                      folderMode={true}
                      drawerDirection="down"
                      isDraggable={false}
                      position={positionsByPlayer[opp2]?.[`${opp2}-road-0`]}
                      zIndex={cardZIndices[`${opp2}-road-0`]}
                      onInspect={() => onInspectCard('road')}
                    />
                  ) : (
                    Array.from({ length: opp2RoadsCount }).map((_, i) => {
                      const cardId = `${opp2}-road-${i}`;
                      return (
                        <TableCard
                          key={cardId}
                          id={cardId}
                          type="road"
                          isStarting={i === 0}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[opp2]?.[cardId]}
                          zIndex={cardZIndices[cardId]}
                          onInspect={() => onInspectCard('road')}
                        />
                      );
                    })
                  )}

                  {isMobile ? (
                    <StackedTableCards
                      idPrefix={`${opp2}-knights`}
                      type="knight"
                      count={opp2KnightsCount}
                      scale={opponentCardScale}
                      baseWidth={125}
                      baseHeight={194}
                      layerOffset={24}
                      folderMode={true}
                      drawerDirection="down"
                      isDraggable={false}
                      position={positionsByPlayer[opp2]?.[`${opp2}-knight-0`]}
                      zIndex={cardZIndices[`${opp2}-knight-0`]}
                      onInspect={() => onInspectCard('knight')}
                    />
                  ) : (
                    Array.from({ length: opp2KnightsCount }).map((_, i) => {
                      const cardId = `${opp2}-knight-${i}`;
                      return (
                        <TableCard
                          key={cardId}
                          id={cardId}
                          type="knight"
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[opp2]?.[cardId]}
                          zIndex={cardZIndices[cardId]}
                          onInspect={() => onInspectCard('knight')}
                        />
                      );
                    })
                  )}

                  {(opp2HasRoute || opp2HasArmy) && (
                    <div className={isMobile ? 'flex flex-col gap-0.5 items-end' : 'flex gap-1 items-end'}>
                      {opp2HasRoute && (
                        <TableCard
                          key={`${opp2}-bonus-longest-route`}
                          id={`${opp2}-bonus-longest-route`}
                          type="longest_route"
                          scale={opponentCardScale}
                          baseWidth={186}
                          baseHeight={120}
                          folderMode={isMobile}
                          drawerDirection="down"
                          position={positionsByPlayer[opp2]?.[`${opp2}-bonus-longest-route`]}
                          zIndex={cardZIndices[`${opp2}-bonus-longest-route`]}
                          onInspect={() => onInspectCard('longest_route')}
                        />
                      )}
                      {opp2HasArmy && (
                        <TableCard
                          key={`${opp2}-bonus-largest-army`}
                          id={`${opp2}-bonus-largest-army`}
                          type="largest_army"
                          scale={opponentCardScale}
                          baseWidth={186}
                          baseHeight={120}
                          folderMode={isMobile}
                          drawerDirection="down"
                          position={positionsByPlayer[opp2]?.[`${opp2}-bonus-largest-army`]}
                          zIndex={cardZIndices[`${opp2}-bonus-largest-army`]}
                          onInspect={() => onInspectCard('largest_army')}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Orta Alan: BUILDING ROW MAT */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto">
          <BuildingRowMat
            view={view}
            onInspectCard={onInspectCard}
            onSelectBuild={handleSelectBuild}
            canBuildMetropolis={isActive}
            scale={marketScale}
          />
        </div>

        {/* Alt Kadranlar (Sol Alt: Opp3, Sağ Alt: SEN / Aktif Oyuncu) */}
        <div className="w-full grid grid-cols-2 gap-1 sm:gap-4 pb-1 sm:pb-3">
          {/* Sol Alt Kadran: Opp3 */}
          {opp3 ? (
            <div className="flex flex-col items-start gap-1 relative justify-end p-1 transition-all duration-300">
              <div className="flex items-end gap-1.5 sm:gap-3">
                <div className="flex flex-col items-start">
                  <div className={`transition-opacity duration-300 ${handCardsDealt ? 'opacity-100' : 'opacity-0'}`}>
                    <FannedHand
                      cardCount={view.players[opp3]?.handCount ?? 0}
                      isCurrentPlayer={false}
                      corner="bottom-left"
                      scale={opponentHandScale}
                    />
                  </div>
                  <PlayerNameplate
                    name={view.players[opp3]?.name || 'Oyuncu'}
                    isTurn={view.activePlayerId === opp3}
                    victoryPoints={view.players[opp3]?.visibleVP ?? 0}
                    hasLongestRoute={opp3HasRoute}
                    hasLargestArmy={opp3HasArmy}
                    cardCount={view.players[opp3]?.handCount}
                    align="left"
                    compact={isMobilePortrait}
                    className="mt-0.5 sm:mt-1"
                  />
                </div>

                {/* Rakip 3 Masadaki Fiziksel Kartları (Alt rakipte çekmeceler yukarı doğru kayar, tek bina sütunu) */}
                <div
                  className={`flex ${isMobile ? 'flex-nowrap gap-0.5 pr-1' : 'flex-wrap gap-1 sm:gap-2 max-w-[160px] sm:max-w-[220px] lg:max-w-[340px] pr-1 sm:pr-10 lg:pr-14'} items-end transition-opacity duration-300 ${
                    tableCardsDealt ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {isMobile
                    ? opp3Area?.stacks?.[0] && (
                        <CardStack
                          key={opp3Area.stacks[0].id}
                          stack={opp3Area.stacks[0]}
                          allStacks={opp3Area.stacks}
                          folderMode={true}
                          drawerDirection="up"
                          onInspectCard={onInspectCard}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                        />
                      )
                    : opp3Area?.stacks.map((stack) => (
                        <CardStack
                          key={stack.id}
                          stack={stack}
                          onInspectCard={onInspectCard}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[opp3]?.[stack.id]}
                          zIndex={cardZIndices[stack.id]}
                        />
                      ))}

                  {isMobile ? (
                    <StackedTableCards
                      idPrefix={`${opp3}-roads`}
                      type="road"
                      count={opp3RoadsCount}
                      scale={opponentCardScale}
                      baseWidth={125}
                      baseHeight={194}
                      layerOffset={24}
                      folderMode={true}
                      drawerDirection="up"
                      isDraggable={false}
                      position={positionsByPlayer[opp3]?.[`${opp3}-road-0`]}
                      zIndex={cardZIndices[`${opp3}-road-0`]}
                      onInspect={() => onInspectCard('road')}
                    />
                  ) : (
                    Array.from({ length: opp3RoadsCount }).map((_, i) => {
                      const cardId = `${opp3}-road-${i}`;
                      return (
                        <TableCard
                          key={cardId}
                          id={cardId}
                          type="road"
                          isStarting={i === 0}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[opp3]?.[cardId]}
                          zIndex={cardZIndices[cardId]}
                          onInspect={() => onInspectCard('road')}
                        />
                      );
                    })
                  )}

                  {isMobile ? (
                    <StackedTableCards
                      idPrefix={`${opp3}-knights`}
                      type="knight"
                      count={opp3KnightsCount}
                      scale={opponentCardScale}
                      baseWidth={125}
                      baseHeight={194}
                      layerOffset={24}
                      folderMode={true}
                      drawerDirection="up"
                      isDraggable={false}
                      position={positionsByPlayer[opp3]?.[`${opp3}-knight-0`]}
                      zIndex={cardZIndices[`${opp3}-knight-0`]}
                      onInspect={() => onInspectCard('knight')}
                    />
                  ) : (
                    Array.from({ length: opp3KnightsCount }).map((_, i) => {
                      const cardId = `${opp3}-knight-${i}`;
                      return (
                        <TableCard
                          key={cardId}
                          id={cardId}
                          type="knight"
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[opp3]?.[cardId]}
                          zIndex={cardZIndices[cardId]}
                          onInspect={() => onInspectCard('knight')}
                        />
                      );
                    })
                  )}

                  {(opp3HasRoute || opp3HasArmy) && (
                    <div className={isMobile ? 'flex flex-col gap-0.5 items-start' : 'flex gap-1 items-end'}>
                      {opp3HasRoute && (
                        <TableCard
                          key={`${opp3}-bonus-longest-route`}
                          id={`${opp3}-bonus-longest-route`}
                          type="longest_route"
                          scale={opponentCardScale}
                          baseWidth={186}
                          baseHeight={120}
                          folderMode={isMobile}
                          drawerDirection="up"
                          position={positionsByPlayer[opp3]?.[`${opp3}-bonus-longest-route`]}
                          zIndex={cardZIndices[`${opp3}-bonus-longest-route`]}
                          onInspect={() => onInspectCard('longest_route')}
                        />
                      )}
                      {opp3HasArmy && (
                        <TableCard
                          key={`${opp3}-bonus-largest-army`}
                          id={`${opp3}-bonus-largest-army`}
                          type="largest_army"
                          scale={opponentCardScale}
                          baseWidth={186}
                          baseHeight={120}
                          folderMode={isMobile}
                          drawerDirection="up"
                          position={positionsByPlayer[opp3]?.[`${opp3}-bonus-largest-army`]}
                          zIndex={cardZIndices[`${opp3}-bonus-largest-army`]}
                          onInspect={() => onInspectCard('largest_army')}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* Sağ Alt Kadran: SENİN MASAN (Sola doğru sapıtmaması için tüm binalar 1 sütunda, yollar 1 sütunda, şövalyeler 1 sütunda, bonuslar 1 sütunda) */}
          <div className={`flex ${isMobilePortrait ? 'flex-col items-end' : 'items-end justify-end'} gap-1 sm:gap-4 lg:gap-8 relative p-0.5 sm:p-1 transition-all duration-300 pb-1 w-full pl-1 sm:pl-10 lg:pl-16 pr-1 sm:pr-2`}>
            <div
              className={`relative z-20 flex-shrink-0 transition-opacity duration-300 ${
                tableCardsDealt ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className={`flex ${isMobile ? 'flex-nowrap gap-0.5 mr-0.5' : 'flex-wrap gap-1 sm:gap-2.5 max-w-[140px] sm:max-w-xl lg:max-w-4xl'} items-end justify-end`}>
                {/* Yerleşim Yığınları: 4P Mobilde tüm binalar tek bir çekmece sütununda dikey istiflenir (sola doğru uzamaz!) */}
                {isMobile ? (
                  primaryYouStack && (
                    <CardStack
                      key="you-4p-combined-buildings"
                      stack={primaryYouStack}
                      allStacks={youStacks}
                      isSelectable={Boolean(upgradeTargetStack)}
                      isSelected={youStacks.some((s) => s.id === selectedStackId)}
                      onSelect={() => {
                        if (upgradeTargetStack) {
                          handleConfirmUpgrade(upgradeTargetStack.id);
                        }
                      }}
                      onInspectCard={onInspectCard}
                      scale={playerCardScale}
                      baseWidth={125}
                      baseHeight={194}
                      isDraggable={false}
                      folderMode={true}
                      drawerDirection="up"
                    />
                  )
                ) : (
                  youArea?.stacks.map((stack, index) => {
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
                      cardWidth: Math.round(125 * playerCardScale),
                    });

                    return (
                      <CardStack
                        key={stack.id}
                        stack={stack}
                        isSelectable={isSelectable}
                        isSelected={isSelected}
                        onSelect={handleConfirmUpgrade}
                        onInspectCard={onInspectCard}
                        scale={playerCardScale}
                        baseWidth={125}
                        baseHeight={194}
                        isDraggable={!isMobile}
                        position={cardPositions[stack.id]}
                        zIndex={cardZIndices[stack.id]}
                        onBringToFront={() => bringToFront(stack.id)}
                        onPositionChange={(pos) => updateCardPosition(stack.id, pos)}
                        onDragMove={(pos) => broadcastCardPosition(stack.id, pos)}
                        onDragChange={setIsCardDragging}
                        clampPosition={clampFn}
                      />
                    );
                  })
                )}

                {/* Road Cards */}
                {isMobile ? (
                  <StackedTableCards
                    idPrefix={`${view.you}-roads`}
                    type="road"
                    count={youRoadsCount}
                    scale={playerCardScale}
                    baseWidth={125}
                    baseHeight={194}
                    layerOffset={24}
                    isDraggable={false}
                    folderMode={true}
                    drawerDirection="up"
                    position={cardPositions[`${view.you}-road-0`] || cardPositions['you-4p-road-0']}
                    zIndex={cardZIndices[`${view.you}-road-0`] || cardZIndices['you-4p-road-0']}
                    onInspect={() => onInspectCard('road')}
                  />
                ) : (
                  Array.from({ length: youRoadsCount }).map((_, i) => {
                    const cardId = `${view.you}-road-${i}`;
                    const slotIdx = (youArea?.stacks.length ?? 1) + i;
                    const clampFn = createSafeZoneClamper({
                      layout: '4P',
                      handPosition: 'bottom-right',
                      slotIndex: slotIdx,
                      totalSlots: totalYouCards,
                      cardWidth: Math.round(125 * playerCardScale),
                    });

                    return (
                      <TableCard
                        key={cardId}
                        id={cardId}
                        type="road"
                        isStarting={i === 0}
                        scale={playerCardScale}
                        baseWidth={125}
                        baseHeight={194}
                        isDraggable={true}
                        position={cardPositions[cardId] || cardPositions[`you-4p-road-${i}`]}
                        zIndex={cardZIndices[cardId] || cardZIndices[`you-4p-road-${i}`]}
                        onBringToFront={() => bringToFront(cardId)}
                        onPositionChange={(pos) => updateCardPosition(cardId, pos)}
                        onDragMove={(pos) => broadcastCardPosition(cardId, pos)}
                        onDragChange={setIsCardDragging}
                        clampPosition={clampFn}
                        onInspect={() => onInspectCard('road')}
                      />
                    );
                  })
                )}

                {/* Knight Cards */}
                {isMobile ? (
                  <StackedTableCards
                    idPrefix={`${view.you}-knights`}
                    type="knight"
                    count={youKnightsCount}
                    scale={playerCardScale}
                    baseWidth={125}
                    baseHeight={194}
                    layerOffset={24}
                    isDraggable={false}
                    folderMode={true}
                    drawerDirection="up"
                    position={cardPositions[`${view.you}-knight-0`] || cardPositions['you-4p-knight-0']}
                    zIndex={cardZIndices[`${view.you}-knight-0`] || cardZIndices['you-4p-knight-0']}
                    onInspect={() => onInspectCard('knight')}
                  />
                ) : (
                  Array.from({ length: youKnightsCount }).map((_, i) => {
                    const cardId = `${view.you}-knight-${i}`;
                    const slotIdx = (youArea?.stacks.length ?? 1) + youRoadsCount + i;
                    const clampFn = createSafeZoneClamper({
                      layout: '4P',
                      handPosition: 'bottom-right',
                      slotIndex: slotIdx,
                      totalSlots: totalYouCards,
                      cardWidth: Math.round(125 * playerCardScale),
                    });

                    return (
                      <TableCard
                        key={cardId}
                        id={cardId}
                        type="knight"
                        scale={playerCardScale}
                        baseWidth={125}
                        baseHeight={194}
                        isDraggable={true}
                        position={cardPositions[cardId] || cardPositions[`you-4p-knight-${i}`]}
                        zIndex={cardZIndices[cardId] || cardZIndices[`you-4p-knight-${i}`]}
                        onBringToFront={() => bringToFront(cardId)}
                        onPositionChange={(pos) => updateCardPosition(cardId, pos)}
                        onDragMove={(pos) => broadcastCardPosition(cardId, pos)}
                        onDragChange={setIsCardDragging}
                        clampPosition={clampFn}
                        onInspect={() => onInspectCard('knight')}
                      />
                    );
                  })
                )}

                {/* Bonus Kartlar: Mobilde tek bir dikey sütunda üst üste dizilir (sola doğru uzamaz) */}
                {(youHasRoute || youHasArmy) && (
                  <div className={isMobile ? 'flex flex-col gap-0.5 items-end' : 'flex gap-1 items-end'}>
                    {youHasRoute && (
                      <TableCard
                        key="bonus-4p-longest-route"
                        id={`${view.you}-bonus-longest-route`}
                        type="longest_route"
                        scale={playerCardScale}
                        baseWidth={186}
                        baseHeight={120}
                        isDraggable={!isMobile}
                        folderMode={isMobile}
                        drawerDirection="up"
                        position={
                          cardPositions[`${view.you}-bonus-longest-route`] ||
                          cardPositions['bonus-4p-longest-route']
                        }
                        zIndex={
                          cardZIndices[`${view.you}-bonus-longest-route`] ||
                          cardZIndices['bonus-4p-longest-route']
                        }
                        onBringToFront={() => bringToFront(`${view.you}-bonus-longest-route`)}
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
                          cardWidth: Math.round(186 * playerCardScale),
                        })}
                        onInspect={() => onInspectCard('longest_route')}
                      />
                    )}
                    {youHasArmy && (
                      <TableCard
                        key="bonus-4p-largest-army"
                        id={`${view.you}-bonus-largest-army`}
                        type="largest_army"
                        scale={playerCardScale}
                        baseWidth={186}
                        baseHeight={120}
                        isDraggable={!isMobile}
                        folderMode={isMobile}
                        drawerDirection="up"
                        position={
                          cardPositions[`${view.you}-bonus-largest-army`] ||
                          cardPositions['bonus-4p-largest-army']
                        }
                        zIndex={
                          cardZIndices[`${view.you}-bonus-largest-army`] ||
                          cardZIndices['bonus-4p-largest-army']
                        }
                        onBringToFront={() => bringToFront(`${view.you}-bonus-largest-army`)}
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
                          cardWidth: Math.round(160 * playerCardScale),
                        })}
                        onInspect={() => onInspectCard('largest_army')}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end z-10 shrink-0">
              <div className={`transition-opacity duration-300 ${handCardsDealt ? 'opacity-100' : 'opacity-0'}`}>
                <FannedHand
                  hand={view.yourHand}
                  isCurrentPlayer={true}
                  corner="bottom-right"
                  onInspectCard={onInspectCard}
                  scale={playerHandScale}
                />
              </div>
              <PlayerNameplate
                name={youPlayer?.name || 'Sen'}
                isTurn={isActive}
                isMe={true}
                victoryPoints={youPlayer?.visibleVP ?? 0}
                hasLongestRoute={youHasRoute}
                hasLargestArmy={youHasArmy}
                cardCount={Object.values(view.yourHand ?? {}).reduce((a, b) => a + b, 0)}
                align="right"
                compact={isMobilePortrait}
                className="mt-0.5 sm:mt-1"
              />
            </div>
          </div>
        </div>
      </GameMat>

      <TableActionButtons
        layout="4P"
        compact={isMobile}
        className={isMobile ? 'fixed bottom-1.5 left-[39%] -translate-x-1/2 z-40' : undefined}
        onOpenTrade={onOpenTrade}
        onEndTurn={onEndTurn}
        isActive={isActive}
        loading={loading}
        openTradeOffersCount={view.tradeOffers.filter((o) => o.status === 'open').length}
        activePlayerName={view.players[view.activePlayerId]?.name}
      />

      <CardAnimationOverlay flyingCards={flyingCards} impacts={impacts} />

      <GameOpeningCinematic
        isOpen={showOpeningCinematic}
        view={view}
        onTableCardsDealt={() => setTableCardsDealt(true)}
        onFinish={handleFinishOpening}
      />
    </div>
  );
};

export default GameDesk4P;
