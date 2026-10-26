import React, { useEffect, useRef, useState } from 'react';
import type { TableCardType } from './TableCard.tsx';
import { TableCard, type CardPosition } from './TableCard.tsx';
import { getBuildingImageUrl } from '../lib/cardImages.ts';
import { assetUrl } from '../lib/assetUrl.ts';
import { clampPositionToViewport } from '../lib/safePlacementBoundary.ts';

export interface StackedTableCardsProps {
  idPrefix: string;
  type: TableCardType;
  count: number;
  scale?: number;
  baseWidth?: number;
  baseHeight?: number;
  layerOffset?: number;
  /** Sadece kart başlıklarının göründüğü, tıklanınca masanın üstünde kayarak açılan çekmece modu */
  folderMode?: boolean;
  /** Çekmecenin masa üstünde kayma yönü ('up': alt oyuncular için yukarı, 'down': üst rakipler için aşağı) */
  drawerDirection?: 'up' | 'down';
  className?: string;
  onInspect?: (type: any, subKind?: any) => void;
  isDraggable?: boolean;
  position?: CardPosition;
  onPositionChange?: (pos: CardPosition) => void;
  onDragMove?: (pos: CardPosition) => void;
  onDragChange?: (isDragging: boolean) => void;
  clampPosition?: (pos: CardPosition) => CardPosition;
  zIndex?: number;
  onBringToFront?: () => void;
}

/**
 * Aynı türdeki birden fazla masa kartını (Yol veya Şövalye)
 * üst başlığı (YOL / ŞÖVALYE) görünecek şekilde dikey basamaklı istifler.
 * `folderMode` aktifken masada yalnızca kartların üst başlık şeritleri görünür;
 * üzerine tıklanınca ekstra bir pencere açmadan doğrudan masanın üstünde kayarak açılır ve kapanır.
 */
export const StackedTableCards: React.FC<StackedTableCardsProps> = ({
  idPrefix,
  type,
  count,
  scale = 1,
  baseWidth = 125,
  baseHeight = 194,
  layerOffset = 30,
  folderMode = false,
  drawerDirection = 'up',
  className = '',
  onInspect,
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

  // Sürükleme durumları (tüm paketi tek seferde taşır)
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

  if (count <= 0) return null;

  const cardW = Math.round(baseWidth * scale);
  const cardH = Math.round(baseHeight * scale);

  // Kapalı çekmece modunda yalnızca başlık şeritleri gözükür
  const topHeaderH = Math.max(18, Math.round(cardH * 0.24));
  const folderStepH =
    count > 1
      ? Math.min(
          Math.max(8, Math.round(cardH * 0.14)),
          Math.max(5, Math.floor(Math.round(cardH * 0.34) / (count - 1)))
        )
      : 0;
  const folderTotalH = topHeaderH + (count - 1) * folderStepH;

  // Normal modda ve açık çekmece modunda dikey basamak yüksekliği (marketi kapatmaması için sınırlandırılmış)
  const maxExtraH = Math.round((folderMode ? 36 : 48) * scale);
  const rawOffset = Math.round(layerOffset * scale);
  const offset =
    count > 1
      ? Math.min(rawOffset, Math.max(Math.round(6 * scale), Math.floor(maxExtraH / (count - 1))))
      : 0;
  const normalTotalH = cardH + (count - 1) * offset;

  const totalH = folderMode ? folderTotalH : normalTotalH;

  const getCardImageUrl = (idx: number): string => {
    if (type === 'road') {
      return idx === 0
        ? assetUrl('/assets/cards/starting/starting_road_front.png')
        : getBuildingImageUrl('road');
    }
    return getBuildingImageUrl('knight');
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
        height: rect.height || totalH,
      };
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onBringToFront?.();
    longPressFiredRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    justDraggedRef.current = false;

    if (onInspect) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = window.setTimeout(() => {
        if (!justDraggedRef.current) {
          longPressFiredRef.current = true;
          try {
            navigator.vibrate?.(40);
          } catch {}
          onInspect(type);
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
        height: rect.height || totalH,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
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
          : { x: Math.round(rawX), y: Math.round(rawY) };

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
    if (folderMode) {
      setIsFolderOpen((prev) => !prev);
    } else {
      onInspect?.(type);
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
      onContextMenu={(e) => {
        e.preventDefault();
        if (folderMode) {
          setIsFolderOpen((prev) => !prev);
        } else {
          onInspect?.(type);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onInspect?.(type);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        width: `${cardW}px`,
        height: `${totalH}px`,
        transform: transformStyle,
        transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
        zIndex: isDragging
          ? 99999
          : isExpandedInPlace
          ? 45
          : zIndex ?? (hasCustomPos ? 5 : 1),
        touchAction: isDraggable ? 'none' : 'auto',
      }}
      className={`relative select-none ${
        isDragging
          ? 'cursor-grabbing scale-105 shadow-2xl z-50 ring-2 ring-sky-400 transition-none'
          : isDraggable
          ? 'cursor-grab hover:scale-[1.02]'
          : 'cursor-pointer active:scale-95'
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
          {Array.from({ length: count }).map((_, i) => {
            const isTop = i === count - 1;
            const topPx = isExpandedInPlace ? i * offset : i * folderStepH;
            const sliceH = isExpandedInPlace
              ? cardH
              : isTop
              ? topHeaderH
              : folderStepH + 4;

            return (
              <div
                key={`${idPrefix}-folder-${i}`}
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
                  isExpandedInPlace
                    ? 'border-amber-400/70 shadow-xl'
                    : 'border-black/45'
                }`}
              >
                <img
                  src={getCardImageUrl(i)}
                  alt={type === 'road' ? 'Yol' : 'Şövalye'}
                  style={{
                    width: `${cardW}px`,
                    height: `${cardH}px`,
                  }}
                  className="object-contain object-top pointer-events-none select-none"
                  draggable={false}
                />
              </div>
            );
          })}
          {/* Çekmece kapalıyken alt dudak çizgisi */}
          {!isExpandedInPlace && (
            <div
              style={{ zIndex: count + 2 }}
              className="absolute bottom-0 inset-x-0 h-[3px] rounded-b-sm bg-gradient-to-r from-amber-700/90 via-amber-400/90 to-amber-700/90 border-t border-black/50 pointer-events-none"
            />
          )}
        </div>
      ) : (
        Array.from({ length: count }).map((_, i) => {
          const topPx = i * offset;

          return (
            <div
              key={`${idPrefix}-${i}`}
              style={{
                width: `${cardW}px`,
                height: `${cardH}px`,
                top: `${topPx}px`,
                left: 0,
                zIndex: i + 1,
              }}
              className="absolute rounded-md overflow-hidden border border-black/35 shadow-md bg-stone-900"
            >
              <TableCard
                id={`${idPrefix}-${i}`}
                type={type}
                isStarting={i === 0 && type === 'road'}
                scale={scale}
                baseWidth={baseWidth}
                baseHeight={baseHeight}
                isDraggable={false}
                onInspect={() => onInspect?.(type)}
              />
            </div>
          );
        })
      )}
    </div>
  );
};
