import React, { useEffect, useState, useRef } from 'react';
import type { BuildingCard, BuildingType, PlayerId, PlayerView, Resource } from '@catankard/engine';
import {
  type FlyingCard,
  type ImpactEffect,
  cardAudio,
} from '../lib/animationHooks.ts';
import { getBuildingImageUrl, getResourceImageUrl } from '../lib/cardImages.ts';
import { assetUrl } from '../lib/assetUrl.ts';

/* ==========================================================================
   CSS 3D STYLES & KEYFRAMES (Ultra-performant GPU transforms)
   ========================================================================== */
export const CARD_ANIMATION_STYLES = `
@keyframes riffleLeft {
  0% {
    transform: translate3d(0, 0, 0) rotateZ(0deg) rotateY(0deg);
  }
  30% {
    transform: translate3d(-75px, -18px, 40px) rotateZ(-16deg) rotateY(26deg);
  }
  65% {
    transform: translate3d(-40px, -8px, 20px) rotateZ(-8deg) rotateY(12deg);
  }
  100% {
    transform: translate3d(0, 0, 0) rotateZ(0deg) rotateY(0deg);
  }
}

@keyframes riffleRight {
  0% {
    transform: translate3d(0, 0, 0) rotateZ(0deg) rotateY(0deg);
  }
  30% {
    transform: translate3d(75px, -18px, 40px) rotateZ(16deg) rotateY(-26deg);
  }
  65% {
    transform: translate3d(40px, -8px, 20px) rotateZ(8deg) rotateY(-12deg);
  }
  100% {
    transform: translate3d(0, 0, 0) rotateZ(0deg) rotateY(0deg);
  }
}

@keyframes cardCascade {
  0% {
    opacity: 0;
    transform: translateY(-25px) scale(0.92);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes shockwavePulse {
  0% {
    transform: translate(-50%, -50%) scale(0.2);
    opacity: 1;
    border-width: 6px;
  }
  60% {
    opacity: 0.85;
  }
  100% {
    transform: translate(-50%, -50%) scale(3.2);
    opacity: 0;
    border-width: 1px;
  }
}

@keyframes snapImpactBounce {
  0% {
    transform: scale(1.3) translateY(-40px) rotateX(15deg);
    box-shadow: 0 30px 45px rgba(0, 0, 0, 0.7);
  }
  65% {
    transform: scale(0.94) translateY(4px) rotateX(-4deg);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
  }
  85% {
    transform: scale(1.03) translateY(-2px) rotateX(2deg);
  }
  100% {
    transform: scale(1) translateY(0) rotateX(0deg);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5);
  }
}

@keyframes replenishSlideIn {
  0% {
    opacity: 0;
    transform: translate3d(-100px, 0, 30px) rotateY(0deg) scale(0.85);
  }
  45% {
    opacity: 1;
    transform: translate3d(0, 0, 20px) rotateY(90deg) scale(1.05);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotateY(180deg) scale(1);
  }
}

@keyframes cardSheenGlide {
  0% {
    transform: translateX(-120%) rotate(25deg);
  }
  100% {
    transform: translateX(250%) rotate(25deg);
  }
}

@keyframes dealFlightArc {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0) rotateZ(0deg) scale(0.7);
  }
  20% {
    opacity: 1;
    transform: translate3d(calc(var(--target-x) * 0.2), calc(var(--target-y) * 0.2), 60px) rotateZ(calc(var(--target-rot) * 0.3)) scale(1.1);
  }
  75% {
    opacity: 1;
    transform: translate3d(calc(var(--target-x) * 0.8), calc(var(--target-y) * 0.8), 25px) rotateZ(calc(var(--target-rot) * 0.85)) scale(1.02);
  }
  100% {
    opacity: 0.15;
    transform: translate3d(var(--target-x), var(--target-y), 0) rotateZ(var(--target-rot)) scale(0.85);
  }
}

.perspective-1000 {
  perspective: 1000px;
}
.perspective-1400 {
  perspective: 1400px;
}
.preserve-3d {
  transform-style: preserve-3d;
}
.backface-hidden {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
`;

/**
 * Global CSS Enjektörü (Bileşen ilk yüklendiğinde stilleri belgeye ekler)
 */
export const CardAnimationStylesInjector: React.FC = () => {
  return <style dangerouslySetInnerHTML={{ __html: CARD_ANIMATION_STYLES }} />;
};

/* ==========================================================================
   1. KART KARILMA ANİMASYONU (Deck Shuffle - Riffle / Cascade)
   ========================================================================== */
export interface DeckShuffle3DProps {
  cardBackUrl?: string;
  width?: number;
  height?: number;
  className?: string;
}

export const DeckShuffle3D: React.FC<DeckShuffle3DProps> = ({
  cardBackUrl = assetUrl('/assets/cards/building/building_back.png'),
  width = 110,
  height = 155,
  className = '',
}) => {
  // 10 adet yaprak kart ile gerçek 3D deste katmanları
  const leftCards = [0, 1, 2, 3, 4];
  const rightCards = [0, 1, 2, 3, 4];

  return (
    <div
      className={`relative perspective-1000 select-none flex items-center justify-center ${className}`}
      style={{ width: `${width * 2.4}px`, height: `${height * 1.3}px` }}
    >
      <CardAnimationStylesInjector />

      {/* Merkez Deste Tabanı / Gölge */}
      <div
        className="absolute rounded-xl bg-black/60 blur-md pointer-events-none"
        style={{
          width: `${width}px`,
          height: `${height * 0.4}px`,
          bottom: '10px',
        }}
      />

      {/* SOL YARIM DESTE (Sol pile riffle) */}
      <div
        className="absolute preserve-3d"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          animation: 'riffleLeft 1.4s cubic-bezier(0.2, 0.8, 0.2, 1) infinite',
        }}
      >
        {leftCards.map((idx) => (
          <div
            key={`left-${idx}`}
            className="absolute inset-0 rounded-xl overflow-hidden border border-amber-600/60 shadow-lg bg-amber-950 preserve-3d"
            style={{
              transform: `translate3d(${idx * 0.8}px, ${-idx * 1.5}px, ${idx * 2}px)`,
              zIndex: idx,
            }}
          >
            <img
              src={cardBackUrl}
              alt="Deste"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* SAĞ YARIM DESTE (Sağ pile riffle) */}
      <div
        className="absolute preserve-3d"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          animation: 'riffleRight 1.4s cubic-bezier(0.2, 0.8, 0.2, 1) infinite',
        }}
      >
        {rightCards.map((idx) => (
          <div
            key={`right-${idx}`}
            className="absolute inset-0 rounded-xl overflow-hidden border border-emerald-600/60 shadow-lg bg-emerald-950 preserve-3d"
            style={{
              transform: `translate3d(${-idx * 0.8}px, ${-idx * 1.5}px, ${idx * 2}px)`,
              zIndex: idx,
            }}
          >
            <img
              src={cardBackUrl}
              alt="Deste"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Ortadaki Karılma Kıvılcım Haresi */}
      <div className="absolute w-24 h-24 rounded-full bg-amber-400/20 blur-xl pointer-events-none animate-pulse" />
    </div>
  );
};

/* ==========================================================================
   2. OYUN BAŞLANGICINDA DAĞITILMA ANİMASYONU (Dealing Cards Overlay)
   ========================================================================== */
export interface DealingCardsOverlayProps {
  playerCount?: number;
  onComplete?: () => void;
  onSkip?: () => void;
}

export const DealingCardsOverlay: React.FC<DealingCardsOverlayProps> = ({
  playerCount = 4,
  onComplete,
  onSkip,
}) => {
  const [cardsDealt, setCardsDealt] = useState<number>(0);

  // Dağıtılacak kart hedefleri (Ekran köşelerine doğru uçuş koordinatları)
  // [dx: viewport px, dy: viewport px, rot: derece, label]
  const targetCoordinates = [
    { dx: '0vw', dy: '35vh', rot: '0deg', label: 'Senin Elin' }, // Alt (Kendisi)
    { dx: '-35vw', dy: '-30vh', rot: '-20deg', label: 'Rakip 1' }, // Sol Üst
    { dx: '35vw', dy: '-30vh', rot: '20deg', label: 'Rakip 2' }, // Sağ Üst
    ...(playerCount === 4
      ? [{ dx: '-35vw', dy: '25vh', rot: '-10deg', label: 'Rakip 3' }] // Sol Alt
      : []),
  ];

  // Her oyuncuya 3 kart dağıtılır (Toplam 3 * oyuncu sayısı kart)
  const totalCards = playerCount * 3;

  useEffect(() => {
    const interval = setInterval(() => {
      setCardsDealt((prev) => {
        const next = prev + 1;
        cardAudio.playDealOrDraw();
        if (next >= totalCards) {
          clearInterval(interval);
          setTimeout(() => {
            onComplete?.();
          }, 600);
        }
        return next;
      });
    }, 140); // 140ms aralıkla staggered uçuş

    return () => clearInterval(interval);
  }, [totalCards, onComplete]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      <CardAnimationStylesInjector />

      {/* Merkez Deste Konumu */}
      <div className="relative perspective-1000 flex items-center justify-center">
        {/* Merkezde Deste Gövdesi */}
        <div
          className="relative rounded-xl border-2 border-amber-500/80 shadow-2xl bg-amber-950 overflow-hidden"
          style={{ width: '90px', height: '130px' }}
        >
          <img
            src={assetUrl('/assets/cards/resource/resource_back.png')}
            alt="Deste"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Uçuş Halindeki Dağıtılan Kartlar */}
        {Array.from({ length: cardsDealt }).map((_, index) => {
          const target = targetCoordinates[index % targetCoordinates.length] || {
            dx: '0vw',
            dy: '35vh',
            rot: '0deg',
            label: 'Senin Elin',
          };
          return (
            <div
              key={`deal-flight-${index}`}
              className="absolute rounded-xl overflow-hidden border border-amber-400 shadow-2xl preserve-3d"
              style={
                {
                  width: '84px',
                  height: '120px',
                  '--target-x': target.dx,
                  '--target-y': target.dy,
                  '--target-rot': target.rot,
                  animation: 'dealFlightArc 0.75s cubic-bezier(0.2, 0.9, 0.3, 1) forwards',
                  zIndex: 100 + index,
                } as React.CSSProperties
              }
            >
              <img
                src={assetUrl('/assets/cards/resource/resource_back.png')}
                alt="Dağıtılan Kart"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-tr from-amber-500/30 via-transparent to-white/40 pointer-events-none" />
            </div>
          );
        })}
      </div>

      {/* Alt Bilgi & Atla Butonu */}
      <div className="absolute bottom-12 pointer-events-auto flex flex-col items-center gap-2">
        <div className="text-amber-300 font-extrabold text-sm md:text-base tracking-wider uppercase drop-shadow-md flex items-center gap-2 bg-black/60 px-4 py-1.5 rounded-full border border-amber-500/40">
          <span className="animate-spin inline-block">🎴</span>
          <span>Kartlar Dağıtılıyor ({cardsDealt} / {totalCards})</span>
        </div>
        {onSkip && (
          <button
            onClick={onSkip}
            className="text-xs text-white/70 hover:text-white underline hover:no-underline px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-xs transition"
          >
            Dağıtımı Atla ➔
          </button>
        )}
      </div>
    </div>
  );
};

/* ==========================================================================
   3. KART ÇEKME ANİMASYONU (Draw Card Flight)
   ========================================================================== */
export interface DrawCardFlightProps {
  card: FlyingCard;
  onDone?: (id: string) => void;
}

export const DrawCardFlight: React.FC<DrawCardFlightProps> = ({ card, onDone }) => {
  const duration = (card.durationMs ?? 600) / 1000;
  const delay = (card.delayMs ?? 0) / 1000;

  useEffect(() => {
    const totalMs = (card.durationMs ?? 600) + (card.delayMs ?? 0);
    const timer = setTimeout(() => {
      onDone?.(card.id);
    }, totalMs);
    return () => clearTimeout(timer);
  }, [card, onDone]);

  return (
    <div
      className="fixed pointer-events-none preserve-3d"
      style={{
        left: `${card.startX}px`,
        top: `${card.startY}px`,
        width: '84px',
        height: '122px',
        transform: `translate3d(${card.endX - card.startX}px, ${card.endY - card.startY}px, 40px) scale(${card.scale ?? 1}) rotateZ(${card.endRotation ?? 0}deg)`,
        transition: `transform ${duration}s cubic-bezier(0.18, 0.89, 0.32, 1.28) ${delay}s, opacity 0.2s ease-out ${duration + delay - 0.1}s`,
        zIndex: 9999,
      }}
    >
      <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-amber-400 shadow-[0_12px_28px_rgba(0,0,0,0.65)] bg-slate-900">
        <img
          src={card.cardImageUrl || card.cardBackUrl || assetUrl('/assets/cards/resource/resource_back.png')}
          alt={card.label || 'Çekilen Kart'}
          className="w-full h-full object-cover"
        />
        {/* Hareket parıltısı */}
        <div className="absolute inset-0 bg-linear-to-tr from-sky-400/25 to-amber-300/30 pointer-events-none" />
      </div>
    </div>
  );
};

/* ==========================================================================
   4. YERE KART KOYMA / İNŞA ETME (Snap To Table & Shockwave)
   ========================================================================== */
export interface PlayCardImpactProps {
  impact: ImpactEffect;
  onDone?: (id: string) => void;
}

export const PlayCardImpact: React.FC<PlayCardImpactProps> = ({ impact, onDone }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone?.(impact.id);
    }, 750);
    return () => clearTimeout(timer);
  }, [impact, onDone]);

  const ringColor = impact.color || 'rgba(56, 189, 248, 0.85)';

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: `${impact.x}px`,
        top: `${impact.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* 1. Birincil Halka Dalgası (Primary Shockwave) */}
      <div
        className="absolute rounded-full"
        style={{
          width: '90px',
          height: '90px',
          border: `3px solid ${ringColor}`,
          animation: 'shockwavePulse 0.65s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
        }}
      />

      {/* 2. İkincil Beyaz Işıma Dalgası */}
      <div
        className="absolute rounded-full"
        style={{
          width: '70px',
          height: '70px',
          border: '2px solid rgba(255, 255, 255, 0.9)',
          animation: 'shockwavePulse 0.65s 0.08s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
        }}
      />

      {/* 3. Merkezde Kıvılcım Patlaması */}
      <div className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/40 blur-md animate-ping" />

      {/* Etiket (Opsiyonel) */}
      {impact.label && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-xs font-black text-amber-300 bg-black/80 px-2 py-0.5 rounded border border-amber-500/60 shadow whitespace-nowrap animate-bounce">
          {impact.label}
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   5. MAĞAZADA YENİ KART AÇILMASI (3D Flip & Slide-in Replenish Slot)
   ========================================================================== */
export interface ReplenishCardSlotProps {
  card?: BuildingCard | null;
  index: number;
  width: number;
  height: number;
  canAfford?: boolean;
  isReplenishing?: boolean;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onInspect?: () => void;
}

export const ReplenishCardSlot: React.FC<ReplenishCardSlotProps> = ({
  card,
  index,
  width,
  height,
  canAfford = false,
  isReplenishing = false,
  onClick,
  onContextMenu,
  onDoubleClick,
  onInspect,
}) => {
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    longPressFiredRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    if (onInspect) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = window.setTimeout(() => {
        longPressFiredRef.current = true;
        try {
          navigator.vibrate?.(40);
        } catch {}
        onInspect();
      }, 400);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartRef.current && longPressTimerRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 8) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  if (!card) {
    return (
      <div
        className="rounded-xl border-2 border-dashed border-stone-600/50 bg-stone-900/20 flex flex-col items-center justify-center text-stone-500"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <span className="text-xs font-bold">#{index + 1}</span>
      </div>
    );
  }

  return (
    <div
      className="perspective-1000 select-none relative"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <CardAnimationStylesInjector />

      <div
        className={`w-full h-full relative preserve-3d transition-transform duration-300 ${
          isReplenishing ? '' : canAfford ? 'hover:scale-105 cursor-pointer' : 'hover:scale-[1.02]'
        }`}
        style={
          isReplenishing
            ? {
                animation: 'replenishSlideIn 0.85s cubic-bezier(0.2, 0.85, 0.3, 1) forwards',
              }
            : {
                transform: 'rotateY(180deg)',
              }
        }
        onClick={(e) => {
          if (longPressFiredRef.current) {
            e.stopPropagation();
            return;
          }
          onClick?.();
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
      >
        {/* ARKA YÜZ (Desteden kapalı kayarak gelen yüz - 0deg) */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border border-emerald-600/80 shadow-lg bg-emerald-950 backface-hidden"
          style={{ transform: 'rotateY(0deg)' }}
        >
          <img
            src={assetUrl('/assets/cards/building/building_back.png')}
            alt="Kapalı Kart"
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>

        {/* ÖN YÜZ (3D flip ile açılan bina kartı - 180deg) */}
        <div
          className={`absolute inset-0 rounded-xl overflow-hidden border transition-all duration-200 backface-hidden ${
            canAfford
              ? 'border-sky-400 ring-2 ring-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.85)] hover:shadow-[0_0_24px_rgba(56,189,248,1)]'
              : 'border-white/20 opacity-90 hover:opacity-100 hover:border-white/50'
          }`}
          style={{ transform: 'rotateY(180deg)' }}
        >
          <img
            src={getBuildingImageUrl(card.type)}
            alt={card.type}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Yeni açıldığında üzerinden geçen ışıma parıltısı (Sheen) */}
          {isReplenishing && (
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{ zIndex: 10 }}
            >
              <div
                className="w-16 h-full bg-linear-to-r from-transparent via-white/70 to-transparent blur-xs"
                style={{
                  animation: 'cardSheenGlide 0.65s 0.4s ease-out forwards',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   6. TAM EKRAN AÇILIŞ SİNEMATİĞİ (Game Opening Cinematic Modal)
   ========================================================================== */
export interface GameOpeningCinematicProps {
  isOpen: boolean;
  view?: PlayerView | null;
  onFinish: () => void;
}

export const GameOpeningCinematic: React.FC<GameOpeningCinematicProps> = ({
  isOpen,
  view,
  onFinish,
}) => {
  const [stage, setStage] = useState<'shuffle' | 'deal' | 'done'>('shuffle');

  useEffect(() => {
    if (!isOpen) return;

    setStage('shuffle');
    cardAudio.playShuffle();

    // 1.5s Deste Karılır
    const shuffleTimer = setTimeout(() => {
      setStage('deal');
      cardAudio.playDealOrDraw();

      // 1.5s Kartlar Dağıtılır
      const dealTimer = setTimeout(() => {
        setStage('done');
        onFinish();
      }, 1500);

      return () => clearTimeout(dealTimer);
    }, 1500);

    return () => clearTimeout(shuffleTimer);
  }, [isOpen, onFinish]);

  if (!isOpen || stage === 'done') return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none">
      <CardAnimationStylesInjector />

      {/* Başlık */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-amber-400 drop-shadow-[0_2px_10px_rgba(251,191,36,0.5)] tracking-wider uppercase mb-2">
          {stage === 'shuffle' ? '🎲 Kartlar Karılıyor...' : '🎴 Masaya Dağıtılıyor...'}
        </h2>
        <p className="text-sm text-stone-300">
          {stage === 'shuffle'
            ? 'Desteler riffle tekniği ile harmanlanıyor'
            : 'Tüm oyuncuların ellerine başlangıç kartları veriliyor'}
        </p>
      </div>

      {/* Sahne */}
      <div className="relative w-full max-w-xl h-80 flex items-center justify-center">
        {stage === 'shuffle' ? (
          <DeckShuffle3D width={120} height={170} />
        ) : (
          <DealingCardsOverlay
            playerCount={view?.turnOrder.length || 4}
            onComplete={() => {
              setStage('done');
              onFinish();
            }}
          />
        )}
      </div>

      {/* Hızlı Atla Butonu */}
      <button
        onClick={onFinish}
        className="mt-6 px-6 py-2.5 bg-amber-600/80 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg border border-amber-400/60 transition active:scale-95 text-sm"
      >
        Hemen Oyuna Başla ➔
      </button>
    </div>
  );
};

/* ==========================================================================
   7. GENEL ANİMASYON KATMANI (Global Card Animation Overlay)
   ========================================================================== */
export interface CardAnimationOverlayProps {
  flyingCards: FlyingCard[];
  impacts: ImpactEffect[];
  onFlightDone?: (id: string) => void;
  onImpactDone?: (id: string) => void;
}

export const CardAnimationOverlay: React.FC<CardAnimationOverlayProps> = ({
  flyingCards,
  impacts,
  onFlightDone,
  onImpactDone,
}) => {
  return (
    <>
      <CardAnimationStylesInjector />

      {/* Havada Uçan Kartlar */}
      {flyingCards.map((card) => (
        <DrawCardFlight key={card.id} card={card} onDone={onFlightDone} />
      ))}

      {/* Masa Darbe Halka Efektleri */}
      {impacts.map((impact) => (
        <PlayCardImpact key={impact.id} impact={impact} onDone={onImpactDone} />
      ))}
    </>
  );
};
