import React, { useState } from 'react';
import type { Resource, ResourceCounts } from '@catankard/engine';
import { getResourceImageUrl } from '../lib/cardImages.ts';

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

  const isCenter = activeCorner === 'bottom-center';
  const mid = (totalCards - 1) / 2;

  // Yelpaze aralıkları: Kartların birbirinin üzerine doğal şekilde binmesi
  const overlapSpacing = isCenter ? (compact ? 22 : 36) * scale : (compact ? 16 : 24) * scale;
  const arcStepY = (compact ? 3 : 5) * scale;

  // Konteyner boyutları
  let containerWidth: number;
  let containerHeight: number;

  if (isCenter) {
    containerWidth = Math.round(cardW + (totalCards - 1) * overlapSpacing + 48);
    containerHeight = Math.round(cardH + (compact ? 28 : 50) * scale);
  } else {
    containerWidth = Math.round(cardW + (totalCards - 1) * overlapSpacing + 16);
    containerHeight = Math.round(cardH + (compact ? 14 : 20) * scale + 16);
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

          // Açı hesaplaması: -10° ile +10° arası doğal, hafif kavis
          const maxSpread = compact ? 18 : 22;
          const stepAngle =
            totalCards <= 1
              ? 0
              : Math.min(compact ? 4 : 5, maxSpread / Math.max(1, totalCards - 1));

          if (activeCorner === 'top-left') {
            // Sol üst köşe: Karşında oturan oyuncu elinde kart tutuyor gibi,
            // kartlar masanın merkezine hafifçe bakacak şekilde (+2° hafif meyil)
            transformOrigin = 'bottom center';
            baseRotation = totalCards <= 1 ? 0 : (i - mid) * stepAngle + 2;
            const arcY = Math.abs(i - mid) * arcStepY;
            translateX = i * overlapSpacing;
            translateY = arcY;
            cardPositionStyle = {
              top: '8px',
              left: '8px',
            };

            if (isHovered && !isOpponentHand) {
              translateY += 10;
              currentScale = 1.15;
              zIndex = 50;
            }
          } else if (activeCorner === 'top-right') {
            // Sağ üst köşe: Masanın merkezine hafifçe bakacak şekilde (-2° hafif meyil)
            transformOrigin = 'bottom center';
            baseRotation = totalCards <= 1 ? 0 : (i - mid) * stepAngle - 2;
            const arcY = Math.abs(i - mid) * arcStepY;
            translateX = i * overlapSpacing;
            translateY = arcY;
            cardPositionStyle = {
              top: '8px',
              left: '8px',
            };

            if (isHovered && !isOpponentHand) {
              translateY += 10;
              currentScale = 1.15;
              zIndex = 50;
            }
          } else if (activeCorner === 'bottom-left') {
            transformOrigin = 'bottom center';
            baseRotation = totalCards <= 1 ? 0 : (i - mid) * stepAngle + 2;
            const arcY = Math.abs(i - mid) * arcStepY;
            translateX = i * overlapSpacing;
            translateY = -arcY;
            cardPositionStyle = {
              bottom: '8px',
              left: '8px',
            };

            if (isHovered && !isOpponentHand) {
              translateY -= 16;
              currentScale = 1.15;
              zIndex = 50;
            }
          } else if (activeCorner === 'bottom-right') {
            transformOrigin = 'bottom center';
            baseRotation = totalCards <= 1 ? 0 : (i - mid) * stepAngle - 2;
            const arcY = Math.abs(i - mid) * arcStepY;
            translateX = i * overlapSpacing;
            translateY = -arcY;
            cardPositionStyle = {
              bottom: '8px',
              left: '8px',
            };

            if (isHovered && !isOpponentHand) {
              translateY -= 16;
              currentScale = 1.15;
              zIndex = 50;
            } else if (isSelected) {
              translateY -= 12;
              zIndex = 40;
            }
          } else {
            // bottom-center (aktif oyuncunun merkezdeki eli veya varsayılan)
            transformOrigin = 'bottom center';
            const maxCenterSpread = compact ? 24 : 34;
            const centerAngleStep =
              totalCards <= 1
                ? 0
                : Math.min(compact ? 5 : 6.5, maxCenterSpread / Math.max(1, totalCards - 1));
            baseRotation = (i - mid) * centerAngleStep;

            const arcY = Math.abs(i - mid) * (compact ? 4 : 7) * scale;

            // Komşuların hafifçe iki yana aralanması (nudge effect)
            let neighborShiftX = 0;
            if (hoveredIndex !== null && !isHovered) {
              const distance = Math.abs(i - hoveredIndex);
              const spreadForce = Math.max(6, (compact ? 12 : 20) - distance * 3);
              if (i < hoveredIndex) {
                neighborShiftX = -spreadForce;
              } else if (i > hoveredIndex) {
                neighborShiftX = spreadForce;
              }
            }

            translateX = (i - mid) * overlapSpacing + neighborShiftX;
            translateY = arcY;

            if (isHovered && !isOpponentHand) {
              translateY = arcY - (compact ? 22 : 32);
              currentScale = 1.15;
              zIndex = 50;
            } else if (isSelected) {
              translateY = arcY - (compact ? 16 : 24);
              zIndex = 40;
            }

            cardPositionStyle = {
              bottom: '8px',
              left: '50%',
              marginLeft: `-${cardW / 2}px`,
            };
          }

          // Kart arkası görseli
          const backImageSrc = '/assets/cards/back/resource_back.png';
          // Kart ön yüz görseli
          const frontImageSrc = res ? getResourceImageUrl(res) : backImageSrc;

          return (
            <div
              key={`${res ?? 'card'}-${i}`}
              onClick={() => {
                if (disabled) return;
                if (res && onCardClick) {
                  onCardClick(res, i);
                }
              }}
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
                  'transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease',
              }}
              className={`absolute cursor-pointer rounded-xl overflow-hidden shadow-md group ${
                isHovered
                  ? 'shadow-2xl shadow-black/80 ring-2 ring-amber-400'
                  : isSelected
                  ? 'shadow-xl shadow-amber-500/40 ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900'
                  : 'shadow-black/60'
              } ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
            >
              {/* Kart İçeriği */}
              {isOpponentHand || !res ? (
                /* RAKİP KARTI - ARKASI DÖNÜK CATAN DESENİ (Bize bakacak şekilde dik ve doğal) */
                <div className="relative w-full h-full bg-gradient-to-br from-amber-950 via-slate-900 to-amber-950 border-2 border-amber-600/70 rounded-xl overflow-hidden flex items-center justify-center">
                  <img
                    src={backImageSrc}
                    alt="Catan Kartı"
                    className="w-full h-full object-cover select-none pointer-events-none"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.includes('resource_back.png')) {
                        img.src = '/assets/cards/resource/resource_back.png';
                      } else {
                        img.style.display = 'none';
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-radial-gradient pointer-events-none border border-amber-400/20 rounded-xl" />
                  <div className="absolute inset-1 border border-amber-500/30 rounded-lg pointer-events-none" />
                </div>
              ) : (
                /* AKTİF OYUNCU KARTI - AÇIK KAYNAK (Üzerinde metin yok, saf kart görseli) */
                <div
                  className={`relative w-full h-full rounded-xl overflow-hidden border-2 bg-slate-900 transition-colors ${
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
