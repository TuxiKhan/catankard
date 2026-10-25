import React, { useRef, useState } from 'react';
import type { TableCardType } from './TableCard.tsx';
import { TableCard, type CardPosition } from './TableCard.tsx';
import { clampPositionToViewport } from '../lib/safePlacementBoundary.ts';

export interface StackedTableCardsProps {
  idPrefix: string;
  type: TableCardType;
  count: number;
  scale?: number;
  baseWidth?: number;
  baseHeight?: number;
  layerOffset?: number;
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
 * köy/şehir yığınları gibi üst başlığı (YOL / ŞÖVALYE) görünecek şekilde
 * dikey basamaklı (şelale) paket olarak sunar.
 */
export const StackedTableCards: React.FC<StackedTableCardsProps> = ({
  idPrefix,
  type,
  count,
  scale = 1,
  baseWidth = 125,
  baseHeight = 194,
  layerOffset = 30,
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
  if (count <= 0) return null;

  const cardW = Math.round(baseWidth * scale);
  const cardH = Math.round(baseHeight * scale);
  const offset = Math.round(layerOffset * scale);
  const totalH = cardH + (count - 1) * offset;

  // Sürükleme durumları (tüm paketi tek seferde taşır)
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<CardPosition>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialPosRef = useRef<CardPosition>({ x: 0, y: 0 });
  const justDraggedRef = useRef<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const initialRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);

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
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    justDraggedRef.current = false;

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
    }, 120);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
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
  };

  const handleClick = (e: React.MouseEvent) => {
    if (justDraggedRef.current) {
      e.stopPropagation();
      return;
    }
    onInspect?.(type);
  };

  const currentX = isDraggable ? initialPosRef.current.x + dragOffset.x : 0;
  const currentY = isDraggable ? initialPosRef.current.y + dragOffset.y : 0;
  const hasCustomPos = currentX !== 0 || currentY !== 0;

  const transformStyle = hasCustomPos
    ? `translate3d(${currentX}px, ${currentY}px, 0)`
    : undefined;

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
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
        zIndex: isDragging ? 100 : (zIndex ?? (hasCustomPos ? 5 : 1)),
        touchAction: isDraggable ? 'none' : 'auto',
      }}
      className={`relative select-none ${
        isDragging
          ? 'cursor-grabbing scale-105 shadow-2xl z-50 ring-2 ring-sky-400 transition-none'
          : isDraggable
          ? 'cursor-grab hover:scale-[1.02]'
          : 'cursor-pointer hover:scale-[1.02]'
      } ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => {
        const isTop = i === count - 1;
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
            {/* Paket adet rozeti: En üstteki kartın üzerinde 'xN' rozeti */}
            {isTop && count > 1 && (
              <div className="absolute top-1 right-1 bg-black/85 text-amber-300 text-[10px] sm:text-xs font-black px-1.5 py-0.2 rounded shadow border border-amber-500/50 pointer-events-none z-10">
                x{count}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
