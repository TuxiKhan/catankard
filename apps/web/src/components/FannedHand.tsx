import React, { useState, useRef } from 'react';
import type { Resource, ResourceCounts } from '@catankard/engine';
import { getResourceImageUrl } from '../lib/cardImages.ts';
import { assetUrl } from '../lib/assetUrl.ts';

export interface FannedHandProps {
  /** Kaynak kartları listesi (örn: ['brick', 'brick', 'wood', 'wool', 'ore']) */
  cards?: Resource[];
  /** Alternatif olarak kaynak miktarları nesnesi (örn: { brick: 2, wood: 1 }) */
  resources?: Partial<Record<Resource, number>>;
  /** Alternatif prop adı (hand) */
  hand?: ResourceCounts;
  /** Rakip elinde toplam kart sayısı bilinirken kullanılan sayı */
  count?: number;
  /** Alternatif prop adı (cardCount) */
  cardCount?: number;
  /** Rakip eli mi? (Arka yüz Catan deseni gösterilir) */
  isOpponent?: boolean;
  /** Aktif oyuncu mu? (true ise açık kaynaklar gösterilir) */
  isCurrentPlayer?: boolean;
  /** Seçili kart index'leri */
  selectedIndices?: number[];
  /** Kart tıklandığında */
  onCardClick?: (resource: Resource, index: number) => void;
  /** Alternatif kart inceleme fonksiyonu */
  onInspectCard?: (type: any, subKind?: any) => void;
  /** Kartın üzerine gelindiğinde */
  onCardHover?: (resource: Resource | null, index: number | null) => void;
  /** Yerleşim hizalaması */
  align?: 'bottom-right' | 'bottom-center' | 'top-left' | 'top-right' | 'none';
  /** Köşe yerleşimi */
  corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center';
  /** Kompakt mod (rakipler veya küçük ekranlar için) */
  compact?: boolean;
  /** Boyutlandırma çarpanı */
  scale?: number;
  /** Tıklama devre dışı */
  disabled?: boolean;
  /** Ek stil sınıfları */
  className?: string;
}

const RESOURCE_META: Record<
  Resource,
  { label: string; bg: string; border: string; accent: string; icon: string }
> = {
  brick: {
    label: 'Tuğla',
    bg: 'from-amber-900 to-red-950',
    border: 'border-red-600/70',
    accent: '#ef4444',
    icon: '🧱',
  },
  wood: {
    label: 'Odun',
    bg: 'from-emerald-950 to-green-900',
    border: 'border-emerald-600/70',
    accent: '#22c55e',
    icon: '🌲',
  },
  wool: {
    label: 'Yün',
    bg: 'from-lime-950 to-emerald-900',
    border: 'border-lime-500/70',
    accent: '#84cc16',
    icon: '🐑',
  },
  wheat: {
    label: 'Buğday',
    bg: 'from-amber-950 to-yellow-900',
    border: 'border-amber-500/70',
    accent: '#eab308',
    icon: '🌾',
  },
  ore: {
    label: 'Demir',
    bg: 'from-slate-900 to-zinc-800',
    border: 'border-slate-500/70',
    accent: '#94a3b8',
    icon: '⛰️',
  },
};

const RES_ORDER: Resource[] = ['ore', 'brick', 'wheat', 'wood', 'wool'];

export const FannedHand: React.FC<FannedHandProps> = ({
  cards,
  resources,
  hand,
  count,
  cardCount,
  isOpponent,
  isCurrentPlayer,
  selectedIndices = [],
  onCardClick,
  onInspectCard,
  onCardHover,
  align = 'none',
  corner,
  compact = false,
  scale = 1,
  disabled = false,
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // isOpponent belirleme
  const isOpponentHand =
    isOpponent !== undefined
      ? isOpponent
      : isCurrentPlayer !== undefined
      ? !isCurrentPlayer
      : false;

  const effectiveResources = resources || hand;
  const effectiveCount = count !== undefined ? count : cardCount;

  // Kart listesini normalize et
  let cardList: (Resource | null)[] = [];

  if (!isOpponentHand && cards && cards.length > 0) {
    cardList = [...cards];
  } else if (!isOpponentHand && effectiveResources) {
    for (const res of RES_ORDER) {
      const c = effectiveResources[res] || 0;
      for (let i = 0; i < c; i++) {
        cardList.push(res);
      }
    }
  } else if (typeof effectiveCount === 'number') {
    cardList = Array.from({ length: Math.max(0, effectiveCount) }, () => null);
  }

  const totalCards = cardList.length;

  if (totalCards === 0) {
    return (
      <div className="flex items-center justify-center p-2 text-xs text-amber-200/50 italic bg-black/20 rounded-xl">
        Kart yok
      </div>
    );
  }

  // Boyutlandırma ve köşe yerleşim türü
  const activeCorner = corner || (align !== 'none' ? align : undefined) || 'bottom-center';

  // Kart boyutları
  const baseW = compact ? 54 : 84;
  const baseH = compact ? 80 : 126;
  const cardW = baseW * scale;
  const cardH = baseH * scale;

  const isBottomFan =
    activeCorner === 'bottom-center' ||
    (activeCorner === 'bottom-right' && !isOpponentHand);
  const isCornerArc =
    activeCorner === 'top-left' ||
    activeCorner === 'top-right' ||
    activeCorner === 'bottom-left' ||
    (activeCorner === 'bottom-right' && isOpponentHand);
  const mid = (totalCards - 1) / 2;

  // Yelpaze aralıkları: Kartların birbirinin üzerine doğal ve homojen şekilde binmesi
  const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const isSmallScreen = winWidth < 768;
  const isMobileLandscape = winHeight <= 520 && winWidth >= 500;

  // İki sıralı dizilim kontrolü (Elde 6 veya daha fazla kart olduğunda iki sıra basamaklı yerleşim)
  const isTwoRow = isBottomFan && !isOpponentHand && totalCards >= 6;
  const topCount = isTwoRow ? Math.ceil(totalCards / 2) : totalCards;
  const bottomCount = isTwoRow ? totalCards - topCount : 0;
  const maxInRow = isTwoRow ? topCount : totalCards;

  const effectiveBaseSpan = isSmallScreen
    ? Math.min(140, winWidth * 0.36)
    : isMobileLandscape
    ? 170
    : compact
    ? 240
    : 380;
  const maxHandSpan = effectiveBaseSpan * (isSmallScreen ? 1 : scale);
  const maxCardStep = (isSmallScreen ? 14 : compact ? 22 : 36) * scale;
  const bottomFanOverlapSpacing =
    totalCards <= 1
      ? 0
      : Math.min(maxCardStep, maxHandSpan / Math.max(1, totalCards - 1));

  const twoRowYOffset = Math.round((compact ? 24 : 32) * scale);
  const rowOverlapSpacing =
    maxInRow <= 1
      ? 0
      : Math.min((isSmallScreen ? 18 : compact ? 24 : 36) * scale, maxHandSpan / Math.max(1, maxInRow - 1));

  // Köşelerdeki rakip yelpazeleri için referans görseldeki gibi sıkışık, doğal kavisli örtüşme
  const maxCornerFanSpan = (isSmallScreen ? 90 : compact ? 130 : 180) * scale;
  const opponentOverlapSpacing =
    totalCards <= 1
      ? 0
      : Math.min((isSmallScreen ? 10 : compact ? 15 : 20) * scale, maxCornerFanSpan / Math.max(1, totalCards - 1));

  // Konteyner boyutları
  let containerWidth: number;
  let containerHeight: number;

  if (isBottomFan) {
    if (isTwoRow) {
      containerWidth = Math.round(cardW + (maxInRow - 1) * rowOverlapSpacing + (isSmallScreen ? 16 : 36));
      containerHeight = Math.round(cardH + twoRowYOffset + (compact || isSmallScreen ? 14 : 36) * scale);
    } else {
      containerWidth = Math.round(cardW + (totalCards - 1) * bottomFanOverlapSpacing + (isSmallScreen ? 16 : 36));
      containerHeight = Math.round(cardH + (compact || isSmallScreen ? 20 : 50) * scale);
    }
  } else if (isCornerArc) {
    const arcExtraW = totalCards > 1 ? (compact || isSmallScreen ? 16 : 38) * scale : 6;
    containerWidth = Math.round(cardW + (totalCards - 1) * opponentOverlapSpacing + arcExtraW + (isSmallScreen ? 8 : 16));
    containerHeight = Math.round(cardH + (compact || isSmallScreen ? 14 : 32) * scale + 12);
  } else {
    containerWidth = Math.round(cardW + (totalCards - 1) * bottomFanOverlapSpacing + (isSmallScreen ? 16 : 36));
    containerHeight = Math.round(cardH + (compact || isSmallScreen ? 20 : 50) * scale);
  }

  // Hizalama konteyner sınıfları (Sadece align açıkça belirtildiyse fixed konumu kullan)
  const alignClass =
    align && align !== 'none'
      ? {
          'bottom-right': 'fixed bottom-4 right-4 z-40',
          'bottom-center': 'fixed bottom-4 left-1/2 -translate-x-1/2 z-40',
          'bottom-left': 'fixed bottom-4 left-4 z-40',
          'top-left': 'fixed top-4 left-4 z-30',
          'top-right': 'fixed top-4 right-4 z-30',
        }[align] ?? 'relative'
      : 'relative';

  const handleMouseEnter = (res: Resource | null, index: number) => {
    if (disabled) return;
    setHoveredIndex(index);
    onCardHover?.(res, index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    onCardHover?.(null, null);
  };

  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef<boolean>(false);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDownCard = (res: Resource | null, index: number, e: React.PointerEvent) => {
    if (disabled || !res) return;
    setHoveredIndex(index);
    longPressFiredRef.current = false;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

    if (onInspectCard) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = window.setTimeout(() => {
        longPressFiredRef.current = true;
        try {
          navigator.vibrate?.(40);
        } catch {}
        onInspectCard(res);
      }, 400);
    }
  };

  const handlePointerMoveCard = (e: React.PointerEvent) => {
    if (pointerStartPosRef.current && longPressTimerRef.current) {
      const dx = e.clientX - pointerStartPosRef.current.x;
      const dy = e.clientY - pointerStartPosRef.current.y;
      if (Math.hypot(dx, dy) > 8) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handlePointerUpCard = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div
      className={`select-none ${alignClass} ${className}`}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="relative pointer-events-auto"
        style={{
          width: `${containerWidth}px`,
          height: `${containerHeight}px`,
        }}
      >
        {cardList.map((res, i) => {
          const isHovered = hoveredIndex === i;
          const isSelected = selectedIndices.includes(i);
          const meta = res ? RESOURCE_META[res] : null;

          let baseRotation = 0;
          let translateX = 0;
          let translateY = 0;
          let transformOrigin = 'bottom center';
          let cardPositionStyle: React.CSSProperties = {};
          let zIndex = i + 1;
          let currentScale = 1;

          // Açı hesaplaması:
          // Köşe elleri için (top-left, top-right, bottom-left) referans görseldeki LoR tarzı yay/kavis (arc fan) matematiği:
          // - İlk kart köşede neredeyse dik (0° meyil)
          // - Sonraki kartlar yay şeklinde artan açıyla masaya doğru açılır (0°, 6°, 13°, 21°, 30°, 40°, 48°)
          // - Doğal bir kavis sağlamak için açı adımı üstel progress^1.15 ile genişler
          const cornerProgress = totalCards > 1 ? i / (totalCards - 1) : 0;
          const maxFanAngle = totalCards <= 1 ? 0 : Math.min(48, (totalCards - 1) * 8);
          const cornerArcAngle = maxFanAngle * Math.pow(cornerProgress, 1.15);

          if (activeCorner === 'top-left') {
            // Sol üst köşe: Kartlar sol üstten başlayarak masanın merkezine doğru kavis çizer
            transformOrigin = '20% 0%';
            baseRotation = -cornerArcAngle;
            const arcY = Math.pow(cornerProgress, 1.4) * (compact ? 16 : 24) * scale;
            translateX = i * opponentOverlapSpacing;
            translateY = arcY;
            zIndex = i + 1;
            cardPositionStyle = {
              top: '8px',
              left: '8px',
            };

            if (isHovered && !isOpponentHand) {
              translateY += 10;
              currentScale = 1.08;
              zIndex = 50;
            }
          } else if (activeCorner === 'top-right') {
            // Sağ üst köşe: Sol üstün ayna simetriği, kartlar sağ üstten masanın merkezine doğru açılır
            transformOrigin = '80% 0%';
            baseRotation = cornerArcAngle;
            const arcY = Math.pow(cornerProgress, 1.4) * (compact ? 16 : 24) * scale;
            translateX = -i * opponentOverlapSpacing;
            translateY = arcY;
            zIndex = i + 1;
            cardPositionStyle = {
              top: '8px',
              right: '8px',
            };

            if (isHovered && !isOpponentHand) {
              translateY += 10;
              currentScale = 1.08;
              zIndex = 50;
            }
          } else if (activeCorner === 'bottom-left') {
            // Sol alt köşe: Kartlar alttan masanın merkezine doğru kavisle yükselerek açılır
            transformOrigin = '20% 100%';
            baseRotation = cornerArcAngle;
            const arcY = Math.pow(cornerProgress, 1.4) * (compact ? 12 : 18) * scale;
            translateX = i * opponentOverlapSpacing;
            translateY = -arcY;
            zIndex = i + 1;
            cardPositionStyle = {
              bottom: '8px',
              left: '8px',
            };

            if (isHovered && !isOpponentHand) {
              translateY -= compact ? 18 : 26;
              currentScale = 1.08;
              zIndex = 50;
            }
          } else if (activeCorner === 'bottom-right' && isOpponentHand) {
            // Sağ alt köşede rakip eli olursa: masanın merkezine doğru kavis
            transformOrigin = '80% 100%';
            baseRotation = -cornerArcAngle;
            const arcY = Math.pow(cornerProgress, 1.4) * (compact ? 12 : 18) * scale;
            translateX = -i * opponentOverlapSpacing;
            translateY = -arcY;
            zIndex = i + 1;
            cardPositionStyle = {
              bottom: '8px',
              right: '8px',
            };
          } else {
            // Aktif oyuncu eli: bottom-center (3P) ve bottom-right (4P) modlarında
            // homojen, akıcı, zıplama olmadan kusursuz gezinme deneyimi
            transformOrigin = 'bottom center';

            if (isTwoRow) {
              const isTopRow = i < topCount;
              const rowPos = isTopRow ? i : i - topCount;
              const countInRow = isTopRow ? topCount : bottomCount;
              const rowMid = (countInRow - 1) / 2;

              const angleStep = Math.min(compact ? 3.5 : 4.5, 22 / Math.max(1, countInRow - 1));
              baseRotation = (rowPos - rowMid) * angleStep;

              const arcStep = (compact ? 2 : 2.5) * scale;
              const arcY = Math.abs(rowPos - rowMid) * arcStep;

              translateX = (rowPos - rowMid) * rowOverlapSpacing;
              translateY = (isTopRow ? -twoRowYOffset : 0) + arcY;
              zIndex = isTopRow ? (i + 1) : (20 + (i - topCount) + 1);

              if (isHovered && !isOpponentHand) {
                translateY -= compact ? 18 : 26;
                currentScale = 1.1;
                zIndex = 100;
              } else if (isSelected) {
                translateY -= compact ? 12 : 16;
                zIndex = 80;
              }

              cardPositionStyle = {
                bottom: '8px',
                left: '50%',
                marginLeft: `-${cardW / 2}px`,
              };
            } else {
              const maxSpread = compact ? 20 : 28;
              const angleStep =
                totalCards <= 1
                  ? 0
                  : Math.min(compact ? 4.5 : 5.5, maxSpread / Math.max(1, totalCards - 1));
              baseRotation = (i - mid) * angleStep;

              const arcStep = (compact ? 2.5 : 4) * scale;
              const arcY = Math.abs(i - mid) * arcStep;

              translateX = (i - mid) * bottomFanOverlapSpacing;
              translateY = arcY;

              if (isHovered && !isOpponentHand) {
                translateY -= compact ? 18 : 26;
                currentScale = 1.08;
                zIndex = 50;
              } else if (isSelected) {
                translateY -= compact ? 12 : 16;
                zIndex = 40;
              }

              cardPositionStyle = {
                bottom: '8px',
                left: '50%',
                marginLeft: `-${cardW / 2}px`,
              };
            }
          }

          // Kart arkası görseli
          const backImageSrc = assetUrl('/assets/cards/back/resource_back.png');
          // Kart ön yüz görseli
          const frontImageSrc = res ? getResourceImageUrl(res) : backImageSrc;

          return (
            <div
              key={`${res ?? 'card'}-${i}`}
              onClick={() => {
                if (disabled) return;
                if (longPressFiredRef.current) return;
                if (res && onCardClick) {
                  onCardClick(res, i);
                } else if (res && onInspectCard) {
                  // Normal oyunda karta dokunulduğunda doğrudan kart detayını aç
                  onInspectCard(res);
                }
              }}
              onPointerDown={(e) => handlePointerDownCard(res, i, e)}
              onPointerMove={handlePointerMoveCard}
              onPointerUp={handlePointerUpCard}
              onPointerCancel={handlePointerUpCard}
              onContextMenu={(e) => {
                if (res && onInspectCard) {
                  e.preventDefault();
                  onInspectCard(res);
                }
              }}
              onDoubleClick={(e) => {
                if (res && onInspectCard) {
                  e.stopPropagation();
                  onInspectCard(res);
                }
              }}
              onMouseEnter={() => handleMouseEnter(res, i)}
              style={{
                ...cardPositionStyle,
                width: `${cardW}px`,
                height: `${cardH}px`,
                transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${baseRotation}deg) scale(${currentScale})`,
                zIndex,
                transformOrigin,
                transition:
                  'transform 0.18s cubic-bezier(0.2, 0.8, 0.35, 1), box-shadow 0.18s ease',
              }}
              className={`absolute cursor-pointer rounded-xl overflow-hidden group select-none ${
                isHovered
                  ? 'shadow-2xl shadow-black/80 ring-2 ring-amber-400'
                  : isSelected
                  ? 'shadow-xl shadow-amber-500/40 ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900'
                  : isOpponentHand
                  ? 'shadow-xl shadow-black/75 border border-white/20 hover:border-white/40'
                  : 'shadow-md shadow-black/60'
              } ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
            >
              {/* Kart İçeriği */}
              {isOpponentHand || !res ? (
                /* RAKİP KARTI - ARKASI DÖNÜK CATAN DESENİ (Bize bakacak şekilde doğal ve derinlikli yay dizilimi) */
                <div className="relative w-full h-full bg-gradient-to-br from-amber-950 via-slate-900 to-amber-950 rounded-xl overflow-hidden flex items-center justify-center">
                  <img
                    src={backImageSrc}
                    alt="Catan Kartı"
                    className="w-full h-full object-cover select-none pointer-events-none drop-shadow-sm"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.includes('resource_back.png')) {
                        img.src = assetUrl('/assets/cards/resource/resource_back.png');
                      } else {
                        img.style.display = 'none';
                      }
                    }}
                  />
                  {/* Kart arkası zarif parlama ve kenar derinliği */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/15 pointer-events-none rounded-xl" />
                  <div className="absolute inset-0 pointer-events-none border border-amber-400/30 rounded-xl shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" />
                </div>
              ) : (
                /* AKTİF OYUNCU KARTI - AÇIK KAYNAK (Üzerinde metin yok, saf kart görseli) */
                <div
                  className={`relative w-full h-full rounded-xl overflow-hidden border-2 bg-slate-900 transition-colors pointer-events-none ${
                    meta ? meta.border : 'border-amber-600'
                  }`}
                >
                  <img
                    src={frontImageSrc}
                    alt={res}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />

                  {/* Fallback Arka Plan Katmanı (Sadece resim yüklenemezse simge görünür) */}
                  <div
                    className={`absolute inset-0 -z-10 bg-gradient-to-b ${
                      meta?.bg ?? 'from-slate-800 to-slate-950'
                    } flex items-center justify-center p-1.5`}
                  >
                    <span className="text-3xl">{meta?.icon}</span>
                  </div>

                  {/* Alt Işıltı Çizgisi */}
                  <div
                    className="absolute bottom-0 inset-x-0 h-1"
                    style={{ backgroundColor: meta?.accent ?? '#f59e0b' }}
                  />

                  {isSelected && (
                    <div className="absolute inset-0 bg-amber-400/20 pointer-events-none border-2 border-yellow-300 rounded-xl animate-pulse" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
