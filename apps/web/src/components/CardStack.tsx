import React, { useEffect, useRef, useState } from 'react';
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
  /** Tüm yığın listesi (verilirse hepsi tek bir dikey istif/çekmece sütununda birleştirilir) */
  allStacks?: SettlementStack[];
  /** Sadece kart başlıklarının göründüğü, tıklanınca masanın üstünde kayarak açılan çekmece modu */
  folderMode?: boolean;
  /** Çekmecenin masa üstünde kayma yönü ('up': alt oyuncular için yukarı, 'down': üst rakipler için aşağı) */
  drawerDirection?: 'up' | 'down';
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
  allStacks,
  folderMode = false,
  drawerDirection = 'up',
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
    stackId: string;
    kind: 'settlement' | 'city' | 'metropolis';
    imgUrl: string;
    label: string;
    metroKind?: MetropolisBKind;
  }> = [];

  if (allStacks && allStacks.length > 0) {
    for (const st of allStacks) {
      layers.push({
        stackId: st.id,
        kind: 'settlement',
        imgUrl: getBuildingImageUrl('settlement'),
        label: 'Köy',
      });
      if (st.top === 'city' || st.top === 'metropolis') {
        layers.push({
          stackId: st.id,
          kind: 'city',
          imgUrl: getBuildingImageUrl('city'),
          label: 'Şehir',
        });
      }
      if (st.top === 'metropolis') {
        layers.push({
          stackId: st.id,
          kind: 'metropolis',
          imgUrl: st.metropolis
            ? getMetropolisImageUrl(st.metropolis)
            : assetUrl('/assets/cards/building/metropolis_A.png'),
          label: 'Büyükşehir',
          metroKind: st.metropolis?.kind,
        });
      }
    }
  } else if (!hasCity) {
    for (let i = 0; i < Math.max(1, count); i++) {
      layers.push({
        stackId: stack.id,
        kind: 'settlement',
        imgUrl: getBuildingImageUrl('settlement'),
        label: 'Köy',
      });
    }
  } else if (!hasMetropolis) {
    for (let i = 0; i < Math.max(1, count); i++) {
      layers.push({
        stackId: stack.id,
        kind: 'settlement',
        imgUrl: getBuildingImageUrl('settlement'),
        label: 'Köy',
      });
      layers.push({
        stackId: stack.id,
        kind: 'city',
        imgUrl: getBuildingImageUrl('city'),
        label: 'Şehir',
      });
    }
  } else {
    for (let i = 0; i < Math.max(1, count); i++) {
      layers.push({
        stackId: stack.id,
        kind: 'settlement',
        imgUrl: getBuildingImageUrl('settlement'),
        label: 'Köy',
      });
      layers.push({
        stackId: stack.id,
        kind: 'city',
        imgUrl: getBuildingImageUrl('city'),
        label: 'Şehir',
      });
      layers.push({
        stackId: stack.id,
        kind: 'metropolis',
        imgUrl: metroImgUrl,
        label: 'Büyükşehir',
        metroKind: metropolis?.kind,
      });
    }
  }

  const layerCount = layers.length;

  // Kapalı çekmece modunda yalnızca başlık şeritleri gözükür (market alanına asla taşmaz)
  const topHeaderH = Math.max(18, Math.round(cardH * 0.24));
  const folderStepH =
    layerCount > 1
      ? Math.min(
          Math.max(8, Math.round(cardH * 0.14)),
          Math.max(5, Math.floor(Math.round(cardH * 0.34) / (layerCount - 1)))
        )
      : 0;
  const folderTotalH = topHeaderH + (layerCount - 1) * folderStepH;

  // Normal modda ve açık çekmece modunda dikey basamak yüksekliği (marketi kapatmaması için sınırlandırılmış)
  const maxExtraH = Math.round((folderMode ? 36 : 48) * effectiveScale);
  const rawOffset = Math.round(layerOffset * effectiveScale);
  const offset =
    layerCount > 1
      ? Math.min(
          rawOffset,
          Math.max(Math.round(6 * effectiveScale), Math.floor(maxExtraH / (layerCount - 1)))
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

  // Dışarıya tıklandığında açık çekmeceyi kapat
  useEffect(() => {
    if (!folderMode || !isFolderOpen) return;
    const handleDocClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsFolderOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleDocClick);
    return () => document.removeEventListener('pointerdown', handleDocClick);
  }, [folderMode, isFolderOpen]);

  const triggerInspect = (
    layerKind?: 'settlement' | 'city' | 'metropolis',
    layerMetroKind?: MetropolisBKind
  ) => {
    if (!inspectFn) return;
    const targetKind = layerKind ?? top;
    if (targetKind === 'metropolis') {
      inspectFn('metropolis', layerMetroKind ?? metropolis?.kind);
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

    if (inspectFn) {
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
      setIsFolderOpen((prev) => !prev);
    } else if (!isDraggable && inspectFn) {
      triggerInspect();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (folderMode) {
      setIsFolderOpen((prev) => !prev);
    } else {
      triggerInspect();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggable) {
      onPositionChange?.({ x: 0, y: 0 });
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

  const isExpandedInPlace = folderMode && isFolderOpen;

  return (
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
        zIndex: isDragging
          ? 100
          : isExpandedInPlace
          ? 45
          : zIndex ?? (isSelected ? 20 : isSelectable ? 10 : hasCustomPos ? 5 : 1),
        touchAction: isDraggable ? 'none' : 'auto',
      }}
      className={`relative select-none ${
        isDragging
          ? 'cursor-grabbing scale-105 shadow-2xl z-50 ring-2 ring-sky-400 transition-none'
          : isDraggable
          ? 'cursor-grab hover:scale-[1.02]'
          : 'cursor-pointer active:scale-95'
      } ${
        isSelected
          ? 'ring-3 ring-sky-400 shadow-sky-500/40 shadow-2xl rounded-md'
          : isSelectable
          ? 'ring-2 ring-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.85)] animate-pulse rounded-md'
          : ''
      } ${className}`}
    >
      {folderMode ? (
        <div
          style={{
            width: `${cardW}px`,
            height: `${isExpandedInPlace ? normalTotalH : folderTotalH}px`,
            ...(drawerDirection === 'down' ? { top: 0 } : { bottom: 0 }),
            left: 0,
          }}
          className="absolute transition-all duration-200 ease-out"
        >
          {layers.map((layer, i) => {
            const isTop = i === layerCount - 1;
            const topPx = isExpandedInPlace ? i * offset : i * folderStepH;
            const sliceH = isExpandedInPlace
              ? cardH
              : isTop
              ? topHeaderH
              : folderStepH + 4;

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
                className={`absolute ${
                  isExpandedInPlace ? 'rounded-md' : 'rounded-t-md'
                } overflow-hidden border shadow-md bg-stone-900 transition-all duration-200 ease-out ${
                  isSelected || isSelectable
                    ? 'border-sky-400'
                    : isExpandedInPlace
                    ? 'border-amber-400/70 shadow-xl'
                    : 'border-black/45'
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
          {/* Çekmece kapalıyken alt dudak çizgisi */}
          {!isExpandedInPlace && (
            <div
              style={{ zIndex: layerCount + 2 }}
              className="absolute bottom-0 inset-x-0 h-[3px] rounded-b-sm bg-gradient-to-r from-amber-700/90 via-amber-400/90 to-amber-700/90 border-t border-black/50 pointer-events-none"
            />
          )}
        </div>
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
  );
};

export default CardStack;
