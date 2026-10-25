import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderOpen, X } from 'lucide-react';
import type {
  BuildingType,
  MetropolisBKind,
  SettlementStack,
} from '@catankard/engine';
import {
  getBuildingImageUrl,
  getMetropolisImageUrl,
} from '../lib/cardImages.ts';
import { assetUrl } from '../lib/assetUrl.ts';
import { clampPositionToViewport } from '../lib/safePlacementBoundary.ts';

export interface CardPosition {
  x: number;
  y: number;
}

export interface GroupedSettlementStack {
  key: string;
  primaryStack: SettlementStack;
  stacks: SettlementStack[];
  count: number;
}

/**
 * Mobilde aynı seviyedeki bina yığınlarını (Köy, Şehir, Büyükşehir)
 * tek bir grup olarak paketler.
 */
export function groupSettlementStacks(
  stacks: SettlementStack[] | undefined | null
): GroupedSettlementStack[] {
  if (!stacks || stacks.length === 0) return [];
  const groups = new Map<string, GroupedSettlementStack>();
  for (const st of stacks) {
    const groupKey =
      st.top === 'metropolis' ? `metropolis-${st.metropolis?.kind ?? 'A'}` : st.top;
    const existing = groups.get(groupKey);
    if (existing) {
      existing.stacks.push(st);
      existing.count += 1;
    } else {
      groups.set(groupKey, {
        key: groupKey,
        primaryStack: st,
        stacks: [st],
        count: 1,
      });
    }
  }
  return Array.from(groups.values());
}

export interface CardStackProps {
  /** Yığın bilgisi (Köy, Şehir, Büyükşehir) */
  stack: SettlementStack;
  /** Aynı seviyedeki yığın adedi (Mobilde gruplama için, varsayılan: 1) */
  count?: number;
  /** Sadece kart başlıklarının göründüğü, tıklanınca klasör penceresi olarak açılan mod */
  folderMode?: boolean;
  /** Yükseltme hedefi olarak seçilebilir mi? */
  isSelectable?: boolean;
  /** Seçili durumda mı? */
  isSelected?: boolean;
  /** Kart inceleme modalını açar */
  onInspect?: (type: BuildingType | 'metropolis', subKind?: MetropolisBKind) => void;
  /** Alternatif isim: onInspectCard */
  onInspectCard?: (type: any, subKind?: any) => void;
  /** Yükseltme seçimi yapıldığında tetiklenir */
  onSelectUpgrade?: (stackId: string) => void | Promise<void>;
  /** Alternatif isim: onSelect */
  onSelect?: (stackId: string) => void | Promise<void>;
  /** Boyutlandırma çarpanı */
  scale?: number;
  /** Boyut preset'i ('sm', 'md', 'lg') */
  size?: 'sm' | 'md' | 'lg' | string;
  /** Taban genişlik (varsayılan: 125px) */
  baseWidth?: number;
  /** Taban yükseklik (varsayılan: 186px) */
  baseHeight?: number;
  /** Katman dikey basamak ofseti (varsayılan: 36px) */
  layerOffset?: number;
  /** Ek Tailwind sınıfları */
  className?: string;

  /** Serbest sürüklenebilir mi? (Aktif oyuncunun kendi kartları için) */
  isDraggable?: boolean;
  /** Masadaki mevcut koordinat konumu */
  position?: CardPosition;
  /** Konum değiştiğinde çağrılır */
  onPositionChange?: (pos: CardPosition) => void;
  /** Sürükleme esnasında canlı pozisyon akışı */
  onDragMove?: (pos: CardPosition) => void;
  /** Sürükleme durumu değiştiğinde tetiklenir */
  onDragChange?: (isDragging: boolean) => void;
  /** Güvenli masa alanı sınırlandırma (Boundary Clamping) fonksiyonu */
  clampPosition?: (pos: CardPosition) => CardPosition;
  /** Dinamik Z-Index katman değeri (en son tutulan kart üstte kalsın) */
  zIndex?: number;
  /** Kart tıklandığında/tutulduğunda öne getirme geri çağırması */
  onBringToFront?: () => void;
}

export const CardStack: React.FC<CardStackProps> = ({
  stack,
  count = 1,
  folderMode = false,
  isSelectable = false,
  isSelected = false,
  onInspect,
  onInspectCard,
  onSelectUpgrade,
  onSelect,
  scale,
  size = 'md',
  baseWidth = 125,
  baseHeight = 194,
  layerOffset = 36,
  className = '',
  isDraggable = false,
  position,
  onPositionChange,
  onDragMove,
  onDragChange,
  clampPosition,
  zIndex,
  onBringToFront,
}) => {
  const [isFolderOpen, setIsFolderOpen] = useState(false);

  const inspectFn = onInspectCard || onInspect;
  const selectFn = onSelectUpgrade || onSelect;

  const effectiveScale = scale ?? (size === 'sm' ? 0.8 : size === 'lg' ? 1.2 : 1);
  const cardW = Math.round(baseWidth * effectiveScale);
  const cardH = Math.round(baseHeight * effectiveScale);

  const { top, metropolis } = stack;
  const hasCity = top === 'city' || top === 'metropolis';
  const hasMetropolis = top === 'metropolis';

  const metroImgUrl = metropolis
    ? getMetropolisImageUrl(metropolis)
    : assetUrl('/assets/cards/building/metropolis_A.png');

  // Yığındaki görsel katmanların listesi (x2/x3 etiketi olmadan her kart kendi başlığıyla yer alır)
  const layers: Array<{
    kind: 'settlement' | 'city' | 'metropolis';
    imgUrl: string;
    label: string;
  }> = [];

  if (!hasCity) {
    for (let i = 0; i < Math.max(1, count); i++) {
      layers.push({
        kind: 'settlement',
        imgUrl: getBuildingImageUrl('settlement'),
        label: 'Köy',
      });
    }
  } else if (!hasMetropolis) {
    for (let i = 0; i < Math.max(1, count); i++) {
      layers.push({
        kind: 'settlement',
        imgUrl: getBuildingImageUrl('settlement'),
        label: 'Köy',
      });
      layers.push({
        kind: 'city',
        imgUrl: getBuildingImageUrl('city'),
        label: 'Şehir',
      });
    }
  } else {
    for (let i = 0; i < Math.max(1, count); i++) {
      layers.push({
        kind: 'settlement',
        imgUrl: getBuildingImageUrl('settlement'),
        label: 'Köy',
      });
      layers.push({
        kind: 'city',
        imgUrl: getBuildingImageUrl('city'),
        label: 'Şehir',
      });
      layers.push({
        kind: 'metropolis',
        imgUrl: metroImgUrl,
        label: 'Büyükşehir',
      });
    }
  }

  const layerCount = layers.length;

  // Kapalı klasör modunda yalnızca başlık şeritleri gözükür
  const topHeaderH = Math.max(18, Math.round(cardH * 0.24));
  const folderStepH =
    layerCount > 1
      ? Math.min(
          Math.max(10, Math.round(cardH * 0.16)),
          Math.max(7, Math.floor(Math.round(cardH * 0.44) / (layerCount - 1)))
        )
      : 0;
  const folderTotalH = topHeaderH + (layerCount - 1) * folderStepH;

  // Normal modda dikey basamak yüksekliği
  const maxExtraH = Math.round(64 * effectiveScale);
  const rawOffset = Math.round(layerOffset * effectiveScale);
  const offset =
    layerCount > 1
      ? Math.min(
          rawOffset,
          Math.max(Math.round(8 * effectiveScale), Math.floor(maxExtraH / (layerCount - 1)))
        )
      : 0;
  const normalTotalH = cardH + (layerCount - 1) * offset;

  const totalHeight = folderMode ? folderTotalH : normalTotalH;

  // Sürükle-bırak durumları
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<CardPosition>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialPosRef = useRef<CardPosition>({ x: 0, y: 0 });
  const justDraggedRef = useRef<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const initialRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef<boolean>(false);

  const triggerInspect = (layerKind?: 'settlement' | 'city' | 'metropolis') => {
    if (!inspectFn) return;
    const targetKind = layerKind ?? top;
    if (targetKind === 'metropolis' && metropolis) {
      inspectFn('metropolis', metropolis.kind);
    } else {
      inspectFn(targetKind);
    }
  };

  if (!isDragging) {
    initialPosRef.current = { x: position?.x ?? 0, y: position?.y ?? 0 };
  }

  const getBaseRect = (element: HTMLElement | null) => {
    if (initialRectRef.current) return initialRectRef.current;
    if (element) {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left - (initialPosRef.current.x || (position?.x ?? 0)),
        top: rect.top - (initialPosRef.current.y || (position?.y ?? 0)),
        width: rect.width || cardW,
        height: rect.height || totalHeight,
      };
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onBringToFront?.();
    longPressFiredRef.current = false;
    justDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { x: position?.x ?? 0, y: position?.y ?? 0 };

    if (inspectFn && !folderMode) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = window.setTimeout(() => {
        if (!justDraggedRef.current) {
          longPressFiredRef.current = true;
          try {
            navigator.vibrate?.(40);
          } catch {}
          triggerInspect();
        }
      }, 400);
    }

    if (!isDraggable) return;
    if (e.button !== 0) return;

    setDragOffset({ x: 0, y: 0 });

    const targetEl = cardRef.current ?? (e.currentTarget as HTMLDivElement);
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      initialRectRef.current = {
        left: rect.left - (position?.x ?? 0),
        top: rect.top - (position?.y ?? 0),
        width: rect.width || cardW,
        height: rect.height || totalHeight,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    if (longPressFiredRef.current) return;
    if (!isDraggable) return;

    if (!isDragging && dist > 6) {
      justDraggedRef.current = true;
      setIsDragging(true);
      onDragChange?.(true);
      const targetEl = cardRef.current ?? (e.currentTarget as HTMLDivElement);
      try {
        targetEl?.setPointerCapture(e.pointerId);
      } catch {}
    }

    if (!isDragging) return;

    const rawX = initialPosRef.current.x + dx;
    const rawY = initialPosRef.current.y + dy;
    let clamped = clampPosition
      ? clampPosition({ x: rawX, y: rawY })
      : { x: rawX, y: rawY };

    const baseRect = getBaseRect(cardRef.current ?? e.currentTarget);
    if (baseRect) {
      clamped = clampPositionToViewport(clamped, baseRect);
    }

    setDragOffset({
      x: clamped.x - initialPosRef.current.x,
      y: clamped.y - initialPosRef.current.y,
    });

    onDragMove?.(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isDragging) {
      try {
        (cardRef.current ?? e.currentTarget).releasePointerCapture(e.pointerId);
      } catch {}

      setIsDragging(false);
      onDragChange?.(false);

      if (justDraggedRef.current) {
        const rawX = initialPosRef.current.x + dragOffset.x;
        const rawY = initialPosRef.current.y + dragOffset.y;
        let finalPos = clampPosition
          ? clampPosition({ x: rawX, y: rawY })
          : {
              x: Math.round(rawX),
              y: Math.round(rawY),
            };

        const baseRect = getBaseRect(cardRef.current ?? e.currentTarget);
        if (baseRect) {
          finalPos = clampPositionToViewport(finalPos, baseRect);
        }

        onPositionChange?.(finalPos);
      }
    }

    dragStartRef.current = null;
    initialRectRef.current = null;
    setDragOffset({ x: 0, y: 0 });

    setTimeout(() => {
      justDraggedRef.current = false;
      longPressFiredRef.current = false;
    }, 120);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isDragging) {
      try {
        (cardRef.current ?? e.currentTarget).releasePointerCapture(e.pointerId);
      } catch {}
      setIsDragging(false);
      onDragChange?.(false);
    }
    dragStartRef.current = null;
    initialRectRef.current = null;
    setDragOffset({ x: 0, y: 0 });
    justDraggedRef.current = false;
    longPressFiredRef.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (justDraggedRef.current || longPressFiredRef.current) {
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    if (isSelectable && selectFn) {
      selectFn(stack.id);
    } else if (folderMode) {
      setIsFolderOpen(true);
    } else if (!isDraggable && inspectFn) {
      triggerInspect();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (folderMode) {
      setIsFolderOpen(true);
    } else {
      triggerInspect();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggable) {
      onPositionChange?.({ x: 0, y: 0 });
    } else if (folderMode) {
      setIsFolderOpen(true);
    } else if (inspectFn) {
      triggerInspect();
    }
  };

  const currentX = isDraggable ? initialPosRef.current.x + dragOffset.x : 0;
  const currentY = isDraggable ? initialPosRef.current.y + dragOffset.y : 0;
  const hasCustomPos = currentX !== 0 || currentY !== 0;

  const transformStyle = hasCustomPos
    ? `translate3d(${currentX}px, ${currentY}px, 0)`
    : undefined;

  const folderTitle = hasMetropolis
    ? 'Büyükşehir İstifi'
    : hasCity
    ? 'Şehir & Köy İstifi'
    : 'Köy İstifi';

  return (
    <>
      <div
        ref={cardRef}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          width: `${cardW}px`,
          height: `${totalHeight}px`,
          transform: transformStyle,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
          zIndex:
            isDragging
              ? 100
              : zIndex ?? (isSelected ? 20 : isSelectable ? 10 : hasCustomPos ? 5 : 1),
          touchAction: isDraggable ? 'none' : 'auto',
        }}
        className={`relative select-none ${
          isDragging
            ? 'cursor-grabbing scale-105 shadow-2xl z-50 ring-2 ring-sky-400 transition-none'
            : isDraggable
            ? 'cursor-grab hover:scale-[1.02]'
            : 'cursor-pointer hover:scale-[1.03] active:scale-95'
        } ${
          isSelected
            ? 'ring-3 ring-sky-400 shadow-sky-500/40 shadow-2xl rounded-md'
            : isSelectable
            ? 'ring-2 ring-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.85)] animate-pulse rounded-md'
            : ''
        } ${className}`}
      >
        {folderMode ? (
          <>
            {layers.map((layer, i) => {
              const isTop = i === layerCount - 1;
              const topPx = i * folderStepH;
              const sliceH = isTop ? topHeaderH : folderStepH + 4;

              return (
                <div
                  key={`${stack.id}-folder-${i}`}
                  style={{
                    width: `${cardW}px`,
                    height: `${sliceH}px`,
                    top: `${topPx}px`,
                    left: 0,
                    zIndex: i + 1,
                  }}
                  className={`absolute rounded-t-md overflow-hidden border shadow-md bg-stone-900 ${
                    isSelected || isSelectable ? 'border-sky-400' : 'border-black/45'
                  }`}
                >
                  <img
                    src={layer.imgUrl}
                    alt={layer.label}
                    style={{
                      width: `${cardW}px`,
                      height: `${cardH}px`,
                    }}
                    className="object-contain object-top pointer-events-none select-none"
                    draggable={false}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              );
            })}
            {/* Klasör alt dudak çizgisi */}
            <div
              style={{ zIndex: layerCount + 2 }}
              className="absolute bottom-0 inset-x-0 h-[3px] rounded-b-sm bg-gradient-to-r from-amber-700/90 via-amber-400/90 to-amber-700/90 border-t border-black/50 pointer-events-none"
            />
          </>
        ) : (
          layers.map((layer, i) => (
            <div
              key={`${stack.id}-layer-${i}`}
              style={{
                width: `${cardW}px`,
                height: `${cardH}px`,
                top: `${i * offset}px`,
                left: 0,
                zIndex: i + 1,
              }}
              className={`absolute rounded-md sm:rounded-lg overflow-hidden border border-black/35 shadow-lg bg-stone-900 ${
                isSelected || isSelectable ? 'border-sky-400' : ''
              }`}
            >
              <img
                src={layer.imgUrl}
                alt={layer.label}
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          ))
        )}
      </div>

      {/* KLASÖR AÇILIR PENCERE (Tıklandığında tam kartları gösterir) */}
      {folderMode &&
        isFolderOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-in fade-in duration-150 select-none"
            onClick={() => setIsFolderOpen(false)}
          >
            <div
              className="relative bg-slate-950/95 border-2 border-amber-500/60 rounded-2xl p-3 sm:p-4 shadow-2xl max-w-[92vw] max-h-[88dvh] flex flex-col gap-2.5 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Klasör Başlığı */}
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-2 text-amber-300 font-black text-xs sm:text-sm">
                  <FolderOpen size={16} className="text-amber-400" />
                  <span>{folderTitle}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFolderOpen(false)}
                  className="text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-lg transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Klasör İçindeki Tam Kartlar */}
              <div className="flex items-center gap-2.5 overflow-x-auto py-1 px-1 scrollbar-thin scrollbar-thumb-white/20">
                {layers.map((layer, i) => (
                  <div
                    key={`${stack.id}-open-${i}`}
                    onClick={() => {
                      setIsFolderOpen(false);
                      triggerInspect(layer.kind);
                    }}
                    style={{ width: '115px', height: '178px' }}
                    className="shrink-0 rounded-lg overflow-hidden border border-amber-400/50 shadow-xl cursor-pointer hover:scale-105 transition-transform bg-stone-900"
                  >
                    <img
                      src={layer.imgUrl}
                      alt={layer.label}
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default CardStack;
