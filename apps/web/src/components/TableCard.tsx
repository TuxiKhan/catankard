import React, { useRef, useState } from 'react';
import {
  getBonusImageUrl,
  getBuildingImageUrl,
} from '../lib/cardImages.ts';

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
  onDragChange,
  clampPosition,
}) => {
  const isBonus = type === 'longest_route' || type === 'largest_army';

  // Bonus kartlar varsayılan olarak yataydır (~160x108), yol/şövalye kartları ise dikeydir (125x186)
  const defaultBaseWidth = isBonus ? 160 : 125;
  const defaultBaseHeight = isBonus ? 108 : 186;

  let effectiveBaseWidth = baseWidth ?? defaultBaseWidth;
  let effectiveBaseHeight = baseHeight ?? defaultBaseHeight;

  // Bonus kart olmasına rağmen üst bileşenden yanlışlıkla dikey boyutlar (width < height) girildiyse yatay orana dönüştür
  if (isBonus && effectiveBaseWidth < effectiveBaseHeight) {
    const ratio = 160 / 108;
    const factor = effectiveBaseWidth / 125;
    effectiveBaseWidth = Math.round(160 * factor);
    effectiveBaseHeight = Math.round(effectiveBaseWidth / ratio);
  }

  const cardW = Math.round(effectiveBaseWidth * scale);
  const cardH = Math.round(effectiveBaseHeight * scale);

  // Kart görselini belirle (Tüm kartlar orijinal tam kart görseliyle render edilir)
  const getImageUrl = (): string => {
    if (type === 'road') {
      return isStarting
        ? '/assets/cards/starting/starting_road_front.png'
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
  const justDraggedRef = useRef<boolean>(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggable) return;
    if (e.button !== 0) return; // Sadece sol tık

    dragStartRef.current = { x: e.clientX, y: e.clientY };
    justDraggedRef.current = false;
    setIsDragging(true);
    onDragChange?.(true);
    setDragOffset({ x: 0, y: 0 });

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.hypot(dx, dy) > 4) {
      justDraggedRef.current = true;
    }

    const rawX = (position?.x ?? 0) + dx;
    const rawY = (position?.y ?? 0) + dy;
    const clamped = clampPosition
      ? clampPosition({ x: rawX, y: rawY })
      : { x: rawX, y: rawY };

    setDragOffset({
      x: clamped.x - (position?.x ?? 0),
      y: clamped.y - (position?.y ?? 0),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setIsDragging(false);
    onDragChange?.(false);

    if (justDraggedRef.current) {
      const rawX = (position?.x ?? 0) + dragOffset.x;
      const rawY = (position?.y ?? 0) + dragOffset.y;
      const finalPos = clampPosition
        ? clampPosition({ x: rawX, y: rawY })
        : {
            x: Math.round(rawX),
            y: Math.round(rawY),
          };

      onPositionChange?.(finalPos);
    }

    dragStartRef.current = null;
    setDragOffset({ x: 0, y: 0 });

    setTimeout(() => {
      justDraggedRef.current = false;
    }, 120);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);
    onDragChange?.(false);
    dragStartRef.current = null;
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

  const currentX = (position?.x ?? 0) + (isDragging ? dragOffset.x : 0);
  const currentY = (position?.y ?? 0) + (isDragging ? dragOffset.y : 0);
  const hasCustomPos = currentX !== 0 || currentY !== 0;

  const transformStyle = hasCustomPos
    ? `translate3d(${currentX}px, ${currentY}px, 0)`
    : undefined;

  return (
    <div
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
        zIndex: isDragging ? 50 : hasCustomPos ? 5 : 1,
        touchAction: isDraggable ? 'none' : 'auto',
      }}
      className={`relative select-none rounded-xl overflow-hidden shadow-lg border border-black/25 transition-shadow ${
        isDragging
          ? 'cursor-grabbing scale-105 shadow-2xl z-50 ring-2 ring-sky-400 transition-none'
          : isDraggable
          ? 'cursor-grab hover:scale-[1.02] hover:shadow-2xl transition-transform duration-100'
          : 'cursor-pointer hover:scale-[1.02] hover:shadow-xl transition-all duration-150'
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
