import React, { useRef, useState } from 'react';
import {
  getBonusImageUrl,
  getBuildingImageUrl,
} from '../lib/cardImages.ts';
import { assetUrl } from '../lib/assetUrl.ts';
import { clampPositionToViewport } from '../lib/safePlacementBoundary.ts';

export interface CardPosition {
  x: number;
  y: number;
}

export type TableCardType = 'road' | 'knight' | 'longest_route' | 'largest_army';

export interface TableCardProps {
  id: string;
  type: TableCardType;
  /** Başlangıç yolu mu? */
  isStarting?: boolean;
  /** Boyutlandırma çarpanı */
  scale?: number;
  /** Kart taban genişliği (varsayılan: 125px dikey, 160px bonus yatay) */
  baseWidth?: number;
  /** Kart taban yüksekliği (varsayılan: 186px dikey, 108px bonus yatay) */
  baseHeight?: number;
  className?: string;
  /** Kart inceleme modalı tetikleyicisi */
  onInspect?: (type: any, subKind?: any) => void;
  /** Serbest sürüklenebilir mi (yalnızca aktif/kendi oyuncu masası için) */
  isDraggable?: boolean;
  /** Masadaki mevcut koordinatı */
  position?: CardPosition;
  /** Konum değiştiğinde çağrılır */
  onPositionChange?: (pos: CardPosition) => void;
  /** Sürükleme esnasında canlı pozisyon akışı */
  onDragMove?: (pos: CardPosition) => void;
  /** Sürükleme durumu değiştiğinde tetiklenir */
  onDragChange?: (isDragging: boolean) => void;
  /** Güvenli masa alanı sınırlandırma fonksiyonu */
  clampPosition?: (pos: CardPosition) => CardPosition;
}

export const TableCard: React.FC<TableCardProps> = ({
  id,
  type,
  isStarting = false,
  scale = 1,
  baseWidth,
  baseHeight,
  className = '',
  onInspect,
  isDraggable = false,
  position,
  onPositionChange,
  onDragMove,
  onDragChange,
  clampPosition,
}) => {
  const isBonus = type === 'longest_route' || type === 'largest_army';

  // Bonus kartlar varsayılan olarak yataydır (186x120), yol/şövalye kartları ise dikeydir (125x194 - orijinal 840:1302 oranı, market kartlarıyla birebir aynı)
  const defaultBaseWidth = isBonus ? 186 : 125;
  const defaultBaseHeight = isBonus ? 120 : 194;

  let effectiveBaseWidth = baseWidth ?? defaultBaseWidth;
  let effectiveBaseHeight = baseHeight ?? defaultBaseHeight;

  // Bonus kart olmasına rağmen üst bileşenden yanlışlıkla dikey boyutlar (width < height) girildiyse yatay orana dönüştür
  if (isBonus && effectiveBaseWidth < effectiveBaseHeight) {
    const ratio = 186 / 120;
    const factor = effectiveBaseWidth / 125;
    effectiveBaseWidth = Math.round(186 * factor);
    effectiveBaseHeight = Math.round(effectiveBaseWidth / ratio);
  }

  const cardW = Math.round(effectiveBaseWidth * scale);
  const cardH = Math.round(effectiveBaseHeight * scale);

  // Kart görselini belirle (Tüm kartlar orijinal tam kart görseliyle render edilir)
  const getImageUrl = (): string => {
    if (type === 'road') {
      return isStarting
        ? assetUrl('/assets/cards/starting/starting_road_front.png')
        : getBuildingImageUrl('road');
    }
    if (type === 'knight') {
      return getBuildingImageUrl('knight');
    }
    if (type === 'longest_route') {
      return getBonusImageUrl('longest_route');
    }
    if (type === 'largest_army') {
      return getBonusImageUrl('largest_army');
    }
    return getBuildingImageUrl('road');
  };

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
        height: rect.height || cardH,
      };
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggable) return;
    if (e.button !== 0) return; // Sadece sol tık

    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { x: position?.x ?? 0, y: position?.y ?? 0 };
    justDraggedRef.current = false;
    setIsDragging(true);
    onDragChange?.(true);
    setDragOffset({ x: 0, y: 0 });

    const targetEl = cardRef.current ?? (e.currentTarget as HTMLDivElement);
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      initialRectRef.current = {
        left: rect.left - (position?.x ?? 0),
        top: rect.top - (position?.y ?? 0),
        width: rect.width || cardW,
        height: rect.height || cardH,
      };
      try {
        targetEl.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.hypot(dx, dy) > 4) {
      justDraggedRef.current = true;
    }

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
    if (!isDragging) return;

    try {
      (cardRef.current ?? e.currentTarget).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

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

    dragStartRef.current = null;
    initialRectRef.current = null;
    setDragOffset({ x: 0, y: 0 });

    setTimeout(() => {
      justDraggedRef.current = false;
    }, 120);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      (cardRef.current ?? e.currentTarget).releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);
    onDragChange?.(false);
    dragStartRef.current = null;
    initialRectRef.current = null;
    setDragOffset({ x: 0, y: 0 });
  };

  const handleClick = (e: React.MouseEvent) => {
    if (justDraggedRef.current) {
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    if (!isDraggable && onInspect) {
      onInspect(type);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onInspect?.(type);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggable) {
      // Çift tıklandığında konumu orijinal yerine sıfırla
      onPositionChange?.({ x: 0, y: 0 });
    } else {
      onInspect?.(type);
    }
  };

  const currentX = isDraggable ? (initialPosRef.current.x + dragOffset.x) : Math.max(-140, Math.min(100, position?.x ?? 0));
  const currentY = isDraggable ? (initialPosRef.current.y + dragOffset.y) : Math.max(-80, Math.min(50, position?.y ?? 0));
  const hasCustomPos = currentX !== 0 || currentY !== 0;

  const transformStyle = hasCustomPos
    ? `translate3d(${currentX}px, ${currentY}px, 0)`
    : undefined;

  return (
    <div
      ref={cardRef}
      id={id}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        width: `${cardW}px`,
        height: `${cardH}px`,
        transform: transformStyle,
        transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
        zIndex: isDragging ? 50 : hasCustomPos ? 5 : 1,
        touchAction: isDraggable ? 'none' : 'auto',
      }}
      className={`relative select-none rounded-xl overflow-hidden shadow-lg border border-black/25 transition-shadow ${
        isDragging
          ? 'cursor-grabbing scale-105 shadow-2xl z-50 ring-2 ring-sky-400 transition-none'
          : isDraggable
          ? 'cursor-grab hover:scale-[1.02] hover:shadow-2xl'
          : 'cursor-pointer hover:scale-[1.02] hover:shadow-xl'
      } ${className}`}
    >
      <img
        src={getImageUrl()}
        alt={type}
        className="w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
    </div>
  );
};

export default TableCard;
