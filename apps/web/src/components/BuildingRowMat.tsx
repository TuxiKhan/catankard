import React, { useState, useRef } from 'react';
import type { BuildingCard, MetropolisCard, PlayerView } from '@catankard/engine';
import {
  getBonusImageUrl,
  getBuildingImageUrl,
  getMetropolisImageUrl,
} from '../lib/cardImages.ts';
import { assetUrl } from '../lib/assetUrl.ts';
import { canAffordCard } from '../lib/canAfford.ts';
import { DeckBrowserModal, type DeckType } from './DeckBrowserModal.tsx';
import { TableCard } from './TableCard.tsx';
import { ReplenishCardSlot } from './CardAnimations.tsx';
import { useReplenishDetector } from '../lib/animationHooks.ts';

export interface BuildingRowMatProps {
  view: PlayerView;
  onInspectCard: (type: any, subKind?: any) => void;
  onSelectBuild: (card: BuildingCard | MetropolisCard, source: 'row' | 'metropolis') => void;
  canBuildMetropolis?: boolean;
  scale?: number;
}

export const BuildingRowMat: React.FC<BuildingRowMatProps> = ({
  view,
  onInspectCard,
  onSelectBuild,
  scale = 1,
}) => {
  const [browsingDeck, setBrowsingDeck] = useState<DeckType | null>(null);
  const { isReplenishing } = useReplenishDetector(view.buildingRow);

  const isActive = view.activePlayerId === view.you && view.phase === 'action';
  const roads = view.players[view.you]?.area?.roads ?? 0;
  const subUsed = view.turnFlags?.roadSubstitutionUsed ?? false;

  const userStacks = view.players[view.you]?.area?.stacks ?? [];
  const hasOpenSettlement = userStacks.some((s) => s.top === 'settlement');
  const hasOpenCity = userStacks.some((s) => s.top === 'city');

  const topMetro = view.metropolisStack.length > 0 ? view.metropolisStack[0] : null;
  const canAffordMetro =
    hasOpenCity && canAffordCard('metropolis', view.yourHand, roads, subUsed);
  const canBuildMetro = isActive && topMetro !== null && canAffordMetro;

  // Taban kart boyutları: 125x194 px
  const cardW = Math.round(125 * scale);
  const cardH = Math.round(194 * scale);

  // Taban bonus kart boyutları (yatay): 186x120 px
  const bonusBaseW = 186;
  const bonusBaseH = 120;
  const bonusShiftY = 20;

  const hasRouteBonus = !view.longestRouteOwner;
  const hasArmyBonus = !view.largestArmyOwner;
  const hasBothBonuses = hasRouteBonus && hasArmyBonus;
  const bonusContainerH = Math.round((hasBothBonuses ? bonusBaseH + bonusShiftY : bonusBaseH) * scale);
  const bonusContainerW = Math.round(bonusBaseW * scale);

  const metroLongPressTimerRef = useRef<number | null>(null);
  const metroLongPressFiredRef = useRef<boolean>(false);
  const metroPointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleMetroPointerDown = (e: React.PointerEvent) => {
    metroLongPressFiredRef.current = false;
    metroPointerStartRef.current = { x: e.clientX, y: e.clientY };
    if (metroLongPressTimerRef.current) clearTimeout(metroLongPressTimerRef.current);
    metroLongPressTimerRef.current = window.setTimeout(() => {
      metroLongPressFiredRef.current = true;
      try {
        navigator.vibrate?.(40);
      } catch {}
      setBrowsingDeck('metropolis');
    }, 400);
  };

  const handleMetroPointerMove = (e: React.PointerEvent) => {
    if (metroPointerStartRef.current && metroLongPressTimerRef.current) {
      const dx = e.clientX - metroPointerStartRef.current.x;
      const dy = e.clientY - metroPointerStartRef.current.y;
      if (Math.hypot(dx, dy) > 8) {
        clearTimeout(metroLongPressTimerRef.current);
        metroLongPressTimerRef.current = null;
      }
    }
  };

  const handleMetroPointerUp = () => {
    if (metroLongPressTimerRef.current) {
      clearTimeout(metroLongPressTimerRef.current);
      metroLongPressTimerRef.current = null;
    }
  };

  const isCompact = scale <= 0.68;
  const [windowDimensions, setWindowDimensions] = useState(() => ({
    winWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
    winHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  React.useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        winWidth: window.innerWidth,
        winHeight: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const { winWidth, winHeight } = windowDimensions;
  const isMobilePortrait = winWidth < 640 && winHeight > winWidth;
  const isMobileLandscape = winHeight <= 520 && winWidth >= 500;

  // Kapalı desteler mobilde daha kompakt olsun, açık kartlar ise büyük ve oynanabilir kalsın
  const isDeckCompact = isMobileLandscape || isMobilePortrait;
  const deckScale = isDeckCompact ? scale * 0.72 : scale;
  const deckW = Math.round(125 * deckScale);
  const deckH = Math.round(194 * deckScale);
  const bonusDeckW = Math.round(bonusBaseW * deckScale);
  const bonusDeckContainerH = Math.round((hasBothBonuses ? bonusBaseH + bonusShiftY : bonusBaseH) * deckScale);

  const renderResourceDeck = () => (
    <div
      className="flex flex-col items-center gap-1 group cursor-pointer shrink-0"
      onClick={() => setBrowsingDeck('resource')}
      onContextMenu={(e) => {
        e.preventDefault();
        setBrowsingDeck('resource');
      }}
    >
      <div
        style={{ width: `${deckW}px`, height: `${deckH}px` }}
        className="relative rounded-lg sm:rounded-xl overflow-hidden border border-amber-800/80 shadow-2xl transition-transform hover:-translate-y-1 hover:shadow-amber-900/60 bg-amber-950"
      >
        <div className="absolute inset-0 bg-amber-900/40 rounded-xl translate-x-1 translate-y-1 -z-10" />
        <img
          src={assetUrl('/assets/cards/resource/resource_back.png')}
          alt="Kaynak Destesi"
          className="w-full h-full object-cover"
          draggable={false}
        />
        <div className="absolute bottom-1 right-1 bg-black/85 text-amber-300 text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 rounded shadow border border-amber-600/40 pointer-events-none">
          {view.resourceDeckCount}
        </div>
      </div>
    </div>
  );

  const renderEventDeck = () => (
    <div
      className="flex flex-col items-center gap-1 group cursor-pointer shrink-0"
      onClick={() => setBrowsingDeck('event')}
      onContextMenu={(e) => {
        e.preventDefault();
        setBrowsingDeck('event');
      }}
    >
      <div
        style={{ width: `${deckW}px`, height: `${deckH}px` }}
        className="relative rounded-lg sm:rounded-xl overflow-hidden border border-slate-700 shadow-2xl transition-transform hover:-translate-y-1 hover:shadow-slate-800 bg-slate-950"
      >
        <div className="absolute inset-0 bg-slate-800/40 rounded-xl translate-x-1 translate-y-1 -z-10" />
        <img
          src={assetUrl('/assets/cards/event/event_back.png')}
          alt="Olay Destesi"
          className="w-full h-full object-cover"
          draggable={false}
        />
        <div className="absolute bottom-1 right-1 bg-black/85 text-slate-200 text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 rounded shadow border border-slate-500/40 pointer-events-none">
          {view.eventDeckCount}
        </div>
      </div>
    </div>
  );

  const renderBuildingDeck = () => (
    <div
      className="relative rounded-lg sm:rounded-xl overflow-hidden border border-emerald-600/70 shadow-lg cursor-pointer group transition-transform hover:-translate-y-0.5 bg-emerald-950 shrink-0"
      style={{ width: `${deckW}px`, height: `${deckH}px` }}
      onClick={() => setBrowsingDeck('building')}
      onContextMenu={(e) => {
        e.preventDefault();
        setBrowsingDeck('building');
      }}
    >
      <div className="absolute inset-0 bg-emerald-950/60 rounded-xl translate-x-0.5 translate-y-0.5 -z-10" />
      <img
        src={assetUrl('/assets/cards/building/building_back.png')}
        alt="İnşaat Kartı Destesi"
        className="w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute bottom-1 right-1 bg-black/85 text-emerald-300 text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 rounded shadow border border-emerald-500/40 pointer-events-none">
        {view.buildingDeckCount}
      </div>
    </div>
  );

  const renderMetropolisStack = () => (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div
        className={`relative rounded-lg sm:rounded-xl overflow-hidden border transition-all duration-200 select-none ${
          canBuildMetro
            ? 'border-sky-400 ring-2 ring-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.85)] hover:shadow-[0_0_24px_rgba(56,189,248,1)] hover:scale-105 cursor-pointer'
            : 'border-amber-900/40 opacity-90 hover:opacity-100 hover:border-amber-700/60 hover:scale-[1.02] cursor-pointer'
        }`}
        style={{ width: `${deckW}px`, height: `${deckH}px` }}
        onPointerDown={handleMetroPointerDown}
        onPointerMove={handleMetroPointerMove}
        onPointerUp={handleMetroPointerUp}
        onPointerCancel={handleMetroPointerUp}
        onClick={() => {
          if (metroLongPressFiredRef.current) return;
          if (canBuildMetro && topMetro) {
            onSelectBuild(topMetro, 'metropolis');
          } else {
            setBrowsingDeck('metropolis');
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setBrowsingDeck('metropolis');
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setBrowsingDeck('metropolis');
        }}
      >
        {topMetro ? (
          <img
            src={getMetropolisImageUrl(topMetro)}
            alt="Büyükşehir"
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-slate-900/90 flex items-center justify-center text-xs text-slate-400 font-bold">
            Tükendi
          </div>
        )}
        <div className="absolute top-1 right-1 bg-yellow-500 text-slate-950 text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 rounded shadow pointer-events-none">
          x{view.metropolisStack.length}
        </div>
      </div>
    </div>
  );

  const renderOpenBuildingCards = () =>
    Array.from({ length: 5 }).map((_, index) => {
      const card = view.buildingRow[index];
      let canAfford = false;
      if (card) {
        canAfford = isActive && canAffordCard(card.type, view.yourHand, roads, subUsed);
        if (card.type === 'city' && !hasOpenSettlement) {
          canAfford = false;
        }
      }

      return (
        <ReplenishCardSlot
          key={'building-slot-' + index}
          card={card}
          index={index}
          width={cardW}
          height={cardH}
          canAfford={canAfford}
          isReplenishing={isReplenishing(index)}
          onInspect={() => {
            if (card) {
              onInspectCard(card.type);
            }
          }}
          onClick={() => {
            if (card) {
              if (canAfford) {
                onSelectBuild(card, 'row');
              } else {
                // Yetersiz kaynak durumunda tıklandığında kart detayını aç
                onInspectCard(card.type);
              }
            }
          }}
          onContextMenu={(e) => {
            if (card) {
              e.preventDefault();
              onInspectCard(card.type);
            }
          }}
          onDoubleClick={(e) => {
            if (card) {
              e.stopPropagation();
              onInspectCard(card.type);
            }
          }}
        />
      );
    });

  const renderBonusCards = () => {
    if (!hasRouteBonus && !hasArmyBonus) return null;
    return (
      <div className="relative flex flex-col items-center justify-center ml-0.5 sm:ml-2 select-none shrink-0">
        <div
          className="relative"
          style={{
            width: `${bonusDeckW}px`,
            height: `${bonusDeckContainerH}px`,
          }}
        >
          {hasRouteBonus && (
            <div
              className={`absolute left-0 top-0 transition-all duration-200 ${
                hasBothBonuses
                  ? 'z-10 hover:z-30 hover:-translate-y-2'
                  : 'z-20 hover:z-30 hover:-translate-y-1'
              }`}
              title="En Uzun Yol (2 Zafer Puanı)"
            >
              <TableCard
                id="table-bonus-longest-route"
                type="longest_route"
                scale={deckScale}
                baseWidth={bonusBaseW}
                baseHeight={bonusBaseH}
                onInspect={() => onInspectCard('longest_route')}
              />
            </div>
          )}
          {hasArmyBonus && (
            <div
              className={`absolute left-0 transition-all duration-200 ${
                hasBothBonuses
                  ? 'z-20 hover:z-30 hover:-translate-y-1'
                  : 'z-20 hover:z-30 hover:-translate-y-1'
              }`}
              style={{
                top: hasBothBonuses ? `${Math.round(bonusShiftY * deckScale)}px` : 0,
              }}
              title="En Güçlü Ordu (2 Zafer Puanı)"
            >
              <TableCard
                id="table-bonus-largest-army"
                type="largest_army"
                scale={deckScale}
                baseWidth={bonusBaseW}
                baseHeight={bonusBaseH}
                onInspect={() => onInspectCard('largest_army')}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {isMobilePortrait ? (
        /* MOBİL DİKEY (PORTRAIT) MOD: 2 Düzenli ve Taşmayan Katman */
        <div className="flex flex-col items-center justify-center gap-1.5 select-none relative my-0.5 w-full max-w-[360px] mx-auto">
          {/* Üst Sıra: Kapalı Desteler & Bonuslar */}
          <div className="flex items-center justify-center gap-1.5">
            {renderResourceDeck()}
            {renderEventDeck()}
            {renderBuildingDeck()}
            {renderMetropolisStack()}
            {renderBonusCards()}
          </div>
          {/* Alt Sıra: 5 Açık İnşaat Kartı Yuvası */}
          <div className="relative border border-white/60 bg-black/40 backdrop-blur-xs shadow-xl flex items-center justify-center rounded-xl px-1.5 py-1">
            <div className="flex items-center gap-1">
              {renderOpenBuildingCards()}
            </div>
          </div>
        </div>
      ) : isMobileLandscape ? (
        /* MOBİL YATAY (LANDSCAPE): Kenar Oyunculara Çarpmayan 2 Sıralı Büyük Kart Düzeni */
        <div className="flex flex-col items-center justify-center select-none relative mt-2 mb-0.5 gap-1 max-w-[480px] mx-auto z-10">
          {/* Üst Sıra: Kapalı Desteler & Bonuslar (Genişlik: ~360px) */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            {renderResourceDeck()}
            {renderEventDeck()}
            {renderBuildingDeck()}
            {renderMetropolisStack()}
            {renderBonusCards()}
          </div>

          {/* Alt Sıra: BÜYÜK VE OKUNAKLI 5 AÇIK İNŞAAT KARTI YUVASI */}
          <div className="relative border-2 border-white/60 bg-black/40 backdrop-blur-xs shadow-2xl flex items-center justify-center rounded-xl px-2 py-1">
            <div className="flex items-center gap-1 sm:gap-1.5">
              {renderOpenBuildingCards()}
            </div>
          </div>
        </div>
      ) : (
        /* PC & MASAÜSTÜ MODU: Klasik Tek Sıra */
        <div
          className={`flex items-center justify-center select-none relative my-0.5 sm:my-2 ${
            isCompact ? 'gap-1.5 sm:gap-3' : 'gap-3 sm:gap-4 md:gap-6'
          }`}
        >
          {renderResourceDeck()}

          {/* ORTA: YATAY "BUILDING ROW" ALANI */}
          <div
            className={`relative border-2 border-white/60 bg-black/35 backdrop-blur-xs shadow-2xl flex flex-col items-center ${
              isCompact
                ? 'rounded-xl px-1.5 py-1'
                : 'rounded-2xl px-3.5 py-2.5'
            }`}
          >
            <div
              className={`flex items-center ${
                isCompact ? 'gap-1 sm:gap-1.5' : 'gap-2 sm:gap-2.5 md:gap-3'
              }`}
            >
              {renderBuildingDeck()}
              {renderOpenBuildingCards()}
            </div>
          </div>

          {/* SAĞ KENAR: Büyükşehir Destesi & Kapalı Olay Kartı Destesi */}
          <div className={`flex items-center ${isCompact ? 'gap-1.5 sm:gap-3' : 'gap-3 sm:gap-4'}`}>
            {renderMetropolisStack()}
            {renderEventDeck()}
          </div>

          {/* SAĞ KENAR: BONUS KARTLAR */}
          {renderBonusCards()}
        </div>
      )}

      {/* Deste Gezinme Karusel Modalı */}
      <DeckBrowserModal
        deckType={browsingDeck}
        onClose={() => setBrowsingDeck(null)}
        metropolisSide={view.config.metropolisSide}
      />
    </>
  );
};

export default BuildingRowMat;
