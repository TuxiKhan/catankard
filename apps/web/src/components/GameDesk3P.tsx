import React, { useState, useEffect } from 'react';
import {
  Clock,
  LogOut,
  Maximize,
  Minimize,
} from 'lucide-react';
import type { BuildingCard, MetropolisCard, PlayerView, Resource } from '@catankard/engine';
import { BuildingRowMat } from './BuildingRowMat.tsx';
import { CardStack, groupSettlementStacks } from './CardStack.tsx';
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

interface GameDesk3PProps {
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

export const GameDesk3P: React.FC<GameDesk3PProps> = ({
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
    isMobileLandscape,
    marketScale,
    opponentCardScale,
    opponentHandScale,
    playerCardScale,
    playerHandScale,
  } = useResponsiveLayout();

  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Masadaki tüm kartların serbestçe sürüklenip bırakılması ve canlı senkronizasyonu
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
    legacyStorageKey: 'catankard_3p_card_positions',
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
        endX: isMe ? window.innerWidth * 0.5 : window.innerWidth * 0.25,
        endY: isMe ? window.innerHeight * 0.85 : window.innerHeight * 0.2,
        scale: 0.95,
        durationMs: 580,
        cardBackUrl: assetUrl('/assets/cards/resource/resource_back.png'),
      });
    },
    onPlayCard: (pid, cardType) => {
      const isMe = pid === view.you;
      spawnImpact({
        x: isMe ? window.innerWidth * 0.5 : window.innerWidth * 0.3,
        y: isMe ? window.innerHeight * 0.65 : window.innerHeight * 0.3,
        color: '#38bdf8',
        label: `${cardType.toUpperCase()} İNŞA EDİLDİ`,
      });
    },
  });

  const isActive = view.activePlayerId === view.you && view.phase === 'action';
  const opponents = view.turnOrder.filter((id) => id !== view.you);
  const oppLeft = opponents[0];
  const oppRight = opponents[1];

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
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.72,
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
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.72,
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
  const oppLeftArea = oppLeft ? view.players[oppLeft]?.area : null;
  const oppLeftRoadsCount = Math.max(1, oppLeftArea?.roads ?? 1);
  const oppLeftKnightsCount = oppLeftArea?.knights ?? 0;
  const oppLeftHasRoute = oppLeft ? view.longestRouteOwner === oppLeft : false;
  const oppLeftHasArmy = oppLeft ? view.largestArmyOwner === oppLeft : false;

  const oppRightArea = oppRight ? view.players[oppRight]?.area : null;
  const oppRightRoadsCount = Math.max(1, oppRightArea?.roads ?? 1);
  const oppRightKnightsCount = oppRightArea?.knights ?? 0;
  const oppRightHasRoute = oppRight ? view.longestRouteOwner === oppRight : false;
  const oppRightHasArmy = oppRight ? view.largestArmyOwner === oppRight : false;

  // Toplam masa kartı sayısı (konumlandırma ve clamping hesapları için)
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

      {/* 1. ÜST TABLO BARI (PC'de Aynen Kalır, Mobilde Gizlenir) */}
      <header className={`${isMobile ? 'hidden' : 'flex'} fixed top-1 sm:top-2 left-1/2 -translate-x-1/2 z-50 w-[98%] max-w-5xl bg-slate-950/85 backdrop-blur-md border border-slate-700/60 rounded-xl sm:rounded-2xl px-2 sm:px-4 py-0.5 sm:py-2 shadow-2xl items-center justify-between transition-all`}>
        {/* Sol: Tur & Sıra */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <span className="font-black text-amber-500 text-xs sm:text-sm tracking-wider uppercase hidden sm:inline">
            Catan On the Road
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

        {/* Orta: Skor Tablosu (Puanlar) */}
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

        {/* Sağ: Zamanlayıcı & Ayrıl Butonu */}
        <div className="flex items-center gap-2.5">
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

      {/* MOBİL İÇİN MİNİMALİST ÜST BİLGİ & KONTROL ROZETİ (Tablo Barı Yerine Masayı Asla Kapatmayan Mikro Kontrol) */}
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

      {/* Yol İkamesi Seçim Çubuğu (Birden fazla fazla kaynak seçeneği olduğunda) */}
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

      {/* 2. OYUN MATI (RED VELVET FELT TABLE) */}
      <GameMat playerCount={3}>
        {/* Üst Alan: 2 Rakip Oyuncu */}
        <div className={`w-full flex items-start justify-between gap-2 sm:gap-4 ${isMobile ? 'pt-1' : 'pt-1 sm:pt-10'}`}>
          {/* Sol Rakip (oppLeft) */}
          {oppLeft && (
            <div className="flex flex-col items-start gap-1 relative p-1 transition-all duration-300">
              <div className="flex items-start gap-2 sm:gap-3">
                {/* Sol Rakip Eli & İsim Etiketi */}
                <div className="flex flex-col items-start">
                  <FannedHand
                    cardCount={view.players[oppLeft]?.handCount ?? 0}
                    isCurrentPlayer={false}
                    corner="top-left"
                    scale={opponentHandScale}
                  />
                  <PlayerNameplate
                    name={view.players[oppLeft]?.name || 'Oyuncu'}
                    isTurn={view.activePlayerId === oppLeft}
                    victoryPoints={view.players[oppLeft]?.visibleVP ?? 0}
                    hasLongestRoute={oppLeftHasRoute}
                    hasLargestArmy={oppLeftHasArmy}
                    cardCount={view.players[oppLeft]?.handCount}
                    align="left"
                    compact={isMobilePortrait}
                    className="mt-0.5 sm:mt-1"
                  />
                </div>

                {/* Sol Rakibin Masadaki Fiziksel Kartları (Köy, Yol, Şövalye, Bonus) */}
                <div className="flex flex-wrap gap-1 sm:gap-2 items-end max-w-[200px] sm:max-w-md pt-1">
                  {/* Settlement Stacks */}
                  {isMobile
                    ? groupSettlementStacks(oppLeftArea?.stacks).map((group) => (
                        <CardStack
                          key={group.primaryStack.id}
                          stack={group.primaryStack}
                          count={group.count}
                          onInspectCard={onInspectCard}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                        />
                      ))
                    : oppLeftArea?.stacks.map((stack) => (
                        <CardStack
                          key={stack.id}
                          stack={stack}
                          onInspectCard={onInspectCard}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[oppLeft]?.[stack.id]}
                          zIndex={cardZIndices[stack.id]}
                        />
                      ))}

                  {/* Road Cards: Mobilde dikey basamaklı paket (istif), PC'de geniş yan yana */}
                  {isMobile ? (
                    <StackedTableCards
                      idPrefix={`${oppLeft}-roads`}
                      type="road"
                      count={oppLeftRoadsCount}
                      scale={opponentCardScale}
                      baseWidth={125}
                      baseHeight={194}
                      layerOffset={30}
                      isDraggable={false}
                      position={positionsByPlayer[oppLeft]?.[`${oppLeft}-road-0`]}
                      zIndex={cardZIndices[`${oppLeft}-road-0`]}
                      onInspect={() => onInspectCard('road')}
                    />
                  ) : (
                    Array.from({ length: oppLeftRoadsCount }).map((_, i) => {
                      const cardId = `${oppLeft}-road-${i}`;
                      return (
                        <TableCard
                          key={cardId}
                          id={cardId}
                          type="road"
                          isStarting={i === 0}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[oppLeft]?.[cardId]}
                          zIndex={cardZIndices[cardId]}
                          onInspect={() => onInspectCard('road')}
                        />
                      );
                    })
                  )}

                  {/* Knight Cards: Mobilde dikey basamaklı paket (istif), PC'de geniş yan yana */}
                  {isMobile ? (
                    <StackedTableCards
                      idPrefix={`${oppLeft}-knights`}
                      type="knight"
                      count={oppLeftKnightsCount}
                      scale={opponentCardScale}
                      baseWidth={125}
                      baseHeight={194}
                      layerOffset={30}
                      isDraggable={false}
                      position={positionsByPlayer[oppLeft]?.[`${oppLeft}-knight-0`]}
                      zIndex={cardZIndices[`${oppLeft}-knight-0`]}
                      onInspect={() => onInspectCard('knight')}
                    />
                  ) : (
                    Array.from({ length: oppLeftKnightsCount }).map((_, i) => {
                      const cardId = `${oppLeft}-knight-${i}`;
                      return (
                        <TableCard
                          key={cardId}
                          id={cardId}
                          type="knight"
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[oppLeft]?.[cardId]}
                          zIndex={cardZIndices[cardId]}
                          onInspect={() => onInspectCard('knight')}
                        />
                      );
                    })
                  )}

                  {/* Bonus Kartlar */}
                  {oppLeftHasRoute && (
                    <TableCard
                      key={`${oppLeft}-bonus-longest-route`}
                      id={`${oppLeft}-bonus-longest-route`}
                      type="longest_route"
                      scale={opponentCardScale}
                      baseWidth={186}
                      baseHeight={120}
                      position={positionsByPlayer[oppLeft]?.[`${oppLeft}-bonus-longest-route`]}
                      zIndex={cardZIndices[`${oppLeft}-bonus-longest-route`]}
                      onInspect={() => onInspectCard('longest_route')}
                    />
                  )}
                  {oppLeftHasArmy && (
                    <TableCard
                      key={`${oppLeft}-bonus-largest-army`}
                      id={`${oppLeft}-bonus-largest-army`}
                      type="largest_army"
                      scale={opponentCardScale}
                      baseWidth={186}
                      baseHeight={120}
                      position={positionsByPlayer[oppLeft]?.[`${oppLeft}-bonus-largest-army`]}
                      zIndex={cardZIndices[`${oppLeft}-bonus-largest-army`]}
                      onInspect={() => onInspectCard('largest_army')}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sağ Rakip (oppRight) */}
          {oppRight && (
            <div className="flex flex-col items-end gap-1 relative p-1 transition-all duration-300">
              <div className="flex items-start gap-2 sm:gap-3 flex-row-reverse">
                {/* Sağ Rakip Eli & İsim Etiketi */}
                <div className="flex flex-col items-end">
                  <FannedHand
                    cardCount={view.players[oppRight]?.handCount ?? 0}
                    isCurrentPlayer={false}
                    corner="top-right"
                    scale={opponentHandScale}
                  />
                  <PlayerNameplate
                    name={view.players[oppRight]?.name || 'Oyuncu'}
                    isTurn={view.activePlayerId === oppRight}
                    victoryPoints={view.players[oppRight]?.visibleVP ?? 0}
                    hasLongestRoute={oppRightHasRoute}
                    hasLargestArmy={oppRightHasArmy}
                    cardCount={view.players[oppRight]?.handCount}
                    align="right"
                    compact={isMobilePortrait}
                    className="mt-0.5 sm:mt-1"
                  />
                </div>

                {/* Sağ Rakibin Masadaki Fiziksel Kartları (Köy, Yol, Şövalye, Bonus) */}
                <div className="flex flex-wrap gap-1 sm:gap-2 items-end justify-end max-w-[200px] sm:max-w-md pt-1">
                  {/* Settlement Stacks */}
                  {isMobile
                    ? groupSettlementStacks(oppRightArea?.stacks).map((group) => (
                        <CardStack
                          key={group.primaryStack.id}
                          stack={group.primaryStack}
                          count={group.count}
                          onInspectCard={onInspectCard}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                        />
                      ))
                    : oppRightArea?.stacks.map((stack) => (
                        <CardStack
                          key={stack.id}
                          stack={stack}
                          onInspectCard={onInspectCard}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[oppRight]?.[stack.id]}
                          zIndex={cardZIndices[stack.id]}
                        />
                      ))}

                  {/* Road Cards: Mobilde dikey basamaklı paket (istif), PC'de geniş yan yana */}
                  {isMobile ? (
                    <StackedTableCards
                      idPrefix={`${oppRight}-roads`}
                      type="road"
                      count={oppRightRoadsCount}
                      scale={opponentCardScale}
                      baseWidth={125}
                      baseHeight={194}
                      layerOffset={30}
                      isDraggable={false}
                      position={positionsByPlayer[oppRight]?.[`${oppRight}-road-0`]}
                      zIndex={cardZIndices[`${oppRight}-road-0`]}
                      onInspect={() => onInspectCard('road')}
                    />
                  ) : (
                    Array.from({ length: oppRightRoadsCount }).map((_, i) => {
                      const cardId = `${oppRight}-road-${i}`;
                      return (
                        <TableCard
                          key={cardId}
                          id={cardId}
                          type="road"
                          isStarting={i === 0}
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[oppRight]?.[cardId]}
                          zIndex={cardZIndices[cardId]}
                          onInspect={() => onInspectCard('road')}
                        />
                      );
                    })
                  )}

                  {/* Knight Cards: Mobilde dikey basamaklı paket (istif), PC'de geniş yan yana */}
                  {isMobile ? (
                    <StackedTableCards
                      idPrefix={`${oppRight}-knights`}
                      type="knight"
                      count={oppRightKnightsCount}
                      scale={opponentCardScale}
                      baseWidth={125}
                      baseHeight={194}
                      layerOffset={30}
                      isDraggable={false}
                      position={positionsByPlayer[oppRight]?.[`${oppRight}-knight-0`]}
                      zIndex={cardZIndices[`${oppRight}-knight-0`]}
                      onInspect={() => onInspectCard('knight')}
                    />
                  ) : (
                    Array.from({ length: oppRightKnightsCount }).map((_, i) => {
                      const cardId = `${oppRight}-knight-${i}`;
                      return (
                        <TableCard
                          key={cardId}
                          id={cardId}
                          type="knight"
                          scale={opponentCardScale}
                          baseWidth={125}
                          baseHeight={194}
                          position={positionsByPlayer[oppRight]?.[cardId]}
                          zIndex={cardZIndices[cardId]}
                          onInspect={() => onInspectCard('knight')}
                        />
                      );
                    })
                  )}

                  {/* Bonus Kartlar */}
                  {oppRightHasRoute && (
                    <TableCard
                      key={`${oppRight}-bonus-longest-route`}
                      id={`${oppRight}-bonus-longest-route`}
                      type="longest_route"
                      scale={opponentCardScale}
                      baseWidth={186}
                      baseHeight={120}
                      position={positionsByPlayer[oppRight]?.[`${oppRight}-bonus-longest-route`]}
                      zIndex={cardZIndices[`${oppRight}-bonus-longest-route`]}
                      onInspect={() => onInspectCard('longest_route')}
                    />
                  )}
                  {oppRightHasArmy && (
                    <TableCard
                      key={`${oppRight}-bonus-largest-army`}
                      id={`${oppRight}-bonus-largest-army`}
                      type="largest_army"
                      scale={opponentCardScale}
                      baseWidth={186}
                      baseHeight={120}
                      position={positionsByPlayer[oppRight]?.[`${oppRight}-bonus-largest-army`]}
                      zIndex={cardZIndices[`${oppRight}-bonus-largest-army`]}
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
            scale={marketScale}
          />
        </div>

        {/* Alt Alan: Kendi Masan (Sürükleme Alanı & Kaynak Kartları) */}
        <div className={`w-full flex ${isMobilePortrait ? 'flex-col items-end' : 'items-end justify-end'} gap-1 sm:gap-4 lg:gap-8 relative p-0.5 sm:p-1 transition-all duration-300 pb-1 sm:pb-3 pr-1 sm:pr-4 pl-1 sm:pl-16`}>
          {/* 1. Masadaki Fiziksel Kartlar (3P'de en sola koymak yerine el kartlarının hemen solunda ve bitişik) */}
          <div className="relative z-20 flex-shrink-0">
            <div className={`flex flex-wrap gap-1 sm:gap-2.5 items-end justify-end ${isMobilePortrait ? 'max-w-[190px]' : isMobileLandscape ? 'max-w-[340px] mr-2' : 'max-w-[140px] sm:max-w-xl lg:max-w-4xl'}`}>
            {/* Settlement Stacks (Köy -> Şehir -> Büyükşehir): Mobilde aynı tür binalar gruplanır, PC'de serbest sürüklenir */}
            {isMobile
              ? groupSettlementStacks(youArea?.stacks).map((group) => {
                  const stack = group.primaryStack;
                  const isSettlement = stack.top === 'settlement';
                  const isCity = stack.top === 'city';
                  const canSelectForCity = pendingUpgrade?.type === 'city' && isSettlement;
                  const canSelectForMetro = pendingUpgrade?.type === 'metropolis' && isCity;
                  const isSelectable = Boolean(canSelectForCity || canSelectForMetro);
                  const isSelected = group.stacks.some((s) => s.id === selectedStackId);

                  return (
                    <CardStack
                      key={stack.id}
                      stack={stack}
                      count={group.count}
                      isSelectable={isSelectable}
                      isSelected={isSelected}
                      onSelect={handleConfirmUpgrade}
                      onInspectCard={onInspectCard}
                      scale={playerCardScale}
                      baseWidth={125}
                      baseHeight={194}
                      isDraggable={false}
                    />
                  );
                })
              : youArea?.stacks.map((stack, index) => {
                  const isSettlement = stack.top === 'settlement';
                  const isCity = stack.top === 'city';

                  const canSelectForCity = pendingUpgrade?.type === 'city' && isSettlement;
                  const canSelectForMetro = pendingUpgrade?.type === 'metropolis' && isCity;
                  const isSelectable = Boolean(canSelectForCity || canSelectForMetro);
                  const isSelected = selectedStackId === stack.id;

                  const clampFn = createSafeZoneClamper({
                    layout: '3P',
                    handPosition: 'bottom-center',
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
                })}

            {/* Road Cards: Mobilde dikey basamaklı paket (istif), PC'de serbest sürüklenebilir kartlar */}
            {isMobile ? (
              <StackedTableCards
                idPrefix={`${view.you}-roads`}
                type="road"
                count={youRoadsCount}
                scale={playerCardScale}
                baseWidth={125}
                baseHeight={194}
                layerOffset={30}
                isDraggable={false}
                position={cardPositions[`${view.you}-road-0`] || cardPositions['you-road-0']}
                zIndex={cardZIndices[`${view.you}-road-0`] || cardZIndices['you-road-0']}
                onInspect={() => onInspectCard('road')}
              />
            ) : (
              Array.from({ length: youRoadsCount }).map((_, i) => {
                const cardId = `${view.you}-road-${i}`;
                const slotIdx = (youArea?.stacks.length ?? 1) + i;
                const clampFn = createSafeZoneClamper({
                  layout: '3P',
                  handPosition: 'bottom-center',
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
                    position={cardPositions[cardId] || cardPositions[`you-road-${i}`]}
                    zIndex={cardZIndices[cardId] || cardZIndices[`you-road-${i}`]}
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

            {/* Knight Cards: Mobilde dikey basamaklı paket (istif), PC'de serbest sürüklenebilir kartlar */}
            {isMobile ? (
              <StackedTableCards
                idPrefix={`${view.you}-knights`}
                type="knight"
                count={youKnightsCount}
                scale={playerCardScale}
                baseWidth={125}
                baseHeight={194}
                layerOffset={30}
                isDraggable={false}
                position={cardPositions[`${view.you}-knight-0`] || cardPositions['you-knight-0']}
                zIndex={cardZIndices[`${view.you}-knight-0`] || cardZIndices['you-knight-0']}
                onInspect={() => onInspectCard('knight')}
              />
            ) : (
              Array.from({ length: youKnightsCount }).map((_, i) => {
                const cardId = `${view.you}-knight-${i}`;
                const slotIdx = (youArea?.stacks.length ?? 1) + youRoadsCount + i;
                const clampFn = createSafeZoneClamper({
                  layout: '3P',
                  handPosition: 'bottom-center',
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
                    position={cardPositions[cardId] || cardPositions[`you-knight-${i}`]}
                    zIndex={cardZIndices[cardId] || cardZIndices[`you-knight-${i}`]}
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

            {/* Bonus Kartlar (En Uzun Yol & En Güçlü Ordu) */}
            {youHasRoute && (
              <TableCard
                key="bonus-longest-route"
                id={`${view.you}-bonus-longest-route`}
                type="longest_route"
                scale={playerCardScale}
                baseWidth={186}
                baseHeight={120}
                isDraggable={!isMobile}
                position={
                  cardPositions[`${view.you}-bonus-longest-route`] ||
                  cardPositions['bonus-longest-route']
                }
                zIndex={
                  cardZIndices[`${view.you}-bonus-longest-route`] ||
                  cardZIndices['bonus-longest-route']
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
                  layout: '3P',
                  handPosition: 'bottom-center',
                  slotIndex: (youArea?.stacks.length ?? 1) + youRoadsCount + youKnightsCount,
                  totalSlots: totalYouCards,
                  cardWidth: Math.round(186 * playerCardScale),
                })}
                onInspect={() => onInspectCard('longest_route')}
              />
            )}
            {youHasArmy && (
              <TableCard
                key="bonus-largest-army"
                id={`${view.you}-bonus-largest-army`}
                type="largest_army"
                scale={playerCardScale}
                baseWidth={186}
                baseHeight={120}
                isDraggable={!isMobile}
                position={
                  cardPositions[`${view.you}-bonus-largest-army`] ||
                  cardPositions['bonus-largest-army']
                }
                zIndex={
                  cardZIndices[`${view.you}-bonus-largest-army`] ||
                  cardZIndices['bonus-largest-army']
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
                  layout: '3P',
                  handPosition: 'bottom-center',
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
          </div>

          {/* 2. Oyuncunun Elindeki Fiziksel Kaynak Yelpazesi & Altında İsim Plakası */}
          <div className="flex flex-col items-end z-10 shrink-0">
            <FannedHand
              hand={view.yourHand}
              isCurrentPlayer={true}
              corner="bottom-right"
              onInspectCard={onInspectCard}
              scale={playerHandScale}
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
              compact={isMobilePortrait}
              className="mt-0.5 sm:mt-1"
            />
          </div>
        </div>
      </GameMat>

      {/* AKSİYON BUTONLARI (3 Kişilik Oyunda Mobilde Sol Altta, PC'de Sağ Altta: Ticaret & Turu Bitir) */}
      <TableActionButtons
        layout="3P"
        compact={isMobile}
        className={isMobile ? 'fixed bottom-2 left-2 z-40' : undefined}
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

export default GameDesk3P;
