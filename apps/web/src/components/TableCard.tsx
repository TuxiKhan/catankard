import React, { useEffect, useRef, useState } from 'react';
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
  /** Kart taban genişliği (varsayılan: 125px dikey, 186px bonus yatay) */
  baseWidth?: number;
  /** Kart taban yüksekliği (varsayılan: 194px dikey, 120px bonus yatay) */
  baseHeight?: number;
  /** Sadece kart başlığının göründüğü, tıklanınca masanın üstünde kayarak açılan çekmece modu */
  folderMode?: boolean;
  /** Çekmecenin masa üstünde kayma yönü ('up': alt oyuncular için yukarı, 'down': üst rakipler için aşağı) */
  drawerDirection?: 'up' | 'down';
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
  /** Dinamik Z-Index katman değeri (en son tutulan kart üstte kalsın) */
  zIndex?: number;
  /** Kart tıklandığında/tutulduğunda öne getirme geri çağırması */
  onBringToFront?: () => void;
}

export const TableCard: React.FC<TableCardProps> = ({
  id,
  type,
  isStarting = false,
  scale = 1,
  baseWidth,
  baseHeight,
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

  const cardW = folderMode && isBonus
    ? Math.round(125 * scale)
    : Math.round(effectiveBaseWidth * scale);
  const fullBonusH = Math.round(cardW / (186 / 120));
  const fullCardH = isBonus ? fullBonusH : Math.round(effectiveBaseHeight * scale);
  const closedDrawerH = Math.max(18, Math.round(194 * scale * 0.24));
  const cardH = folderMode ? closedDrawerH : fullCardH;

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
    onBringToFront?.();
    longPressFiredRef.current = false;
    justDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { x: position?.x ?? 0, y: position?.y ?? 0 };

    // Mobilde veya dokunmatikte uzun basarak (400ms) kart detayını inceleme
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
    if (e.button !== 0) return; // Sadece sol tık

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
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const dist = Math.hypot(dx, dy);

    // Parmağın veya farenin hareketi 8px'i aşarsa uzun basmayı iptal et
    if (dist > 8) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // Uzun basma penceresi açıldıysa sürüklemeyi başlatma
    if (longPressFiredRef.current) return;
    if (!isDraggable) return;

    // Sürükleme eşiği aşıldığında sürüklemeyi devreye al
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
    if (folderMode) {
      setIsFolderOpen((prev) => !prev);
      return;
    }
    // Sabit kartlarda (rakip kartları veya masaüstü inceleme) doğrudan detay açılır
    if (!isDraggable && onInspect) {
      onInspect(type);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (folderMode) {
      setIsFolderOpen((prev) => !prev);
    } else {
      onInspect?.(type);
    }
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

  const currentX = isDraggable ? (initialPosRef.current.x + dragOffset.x) : 0;
  const currentY = isDraggable ? (initialPosRef.current.y + dragOffset.y) : 0;
  const hasCustomPos = currentX !== 0 || currentY !== 0;

  const transformStyle = hasCustomPos
    ? `translate3d(${currentX}px, ${currentY}px, 0)`
    : undefined;

  const isExpandedInPlace = folderMode && isFolderOpen;

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
        zIndex: isDragging
          ? 99999
          : isExpandedInPlace
          ? 45
          : zIndex ?? (hasCustomPos ? 5 : 1),
        touchAction: isDraggable ? 'none' : 'auto',
      }}
      className={`relative select-none ${
        !folderMode ? 'rounded-md sm:rounded-lg overflow-hidden shadow-lg border border-black/40 bg-stone-900' : ''
      } transition-shadow ${
        isDragging
          ? 'cursor-grabbing scale-105 shadow-2xl z-50 ring-2 ring-sky-400 transition-none'
          : isDraggable
          ? 'cursor-grab hover:scale-[1.02] hover:shadow-2xl'
          : 'cursor-pointer active:scale-95'
      } ${className}`}
    >
      {folderMode ? (
        <div
          style={{
            width: `${cardW}px`,
            height: `${isExpandedInPlace ? fullCardH : closedDrawerH}px`,
            ...(drawerDirection === 'down' ? { top: 0 } : { bottom: 0 }),
            left: 0,
          }}
          className={`absolute ${
            isExpandedInPlace ? 'rounded-md border-amber-400/70 shadow-xl' : 'rounded-t-md border-black/45 shadow-md'
          } overflow-hidden border bg-stone-900 transition-all duration-200 ease-out`}
        >
          <img
            src={getImageUrl()}
            alt={type}
            style={{
              width: `${cardW}px`,
              height: `${fullCardH}px`,
              marginTop:
                isBonus && !isExpandedInPlace
                  ? `-${Math.round(fullBonusH * 0.45)}px`
                  : '0px',
            }}
            className="object-contain object-top pointer-events-none select-none transition-all duration-200 ease-out"
            draggable={false}
          />
          {!isExpandedInPlace && (
            <div className="absolute bottom-0 inset-x-0 h-[3px] rounded-b-sm bg-gradient-to-r from-amber-700/90 via-amber-400/90 to-amber-700/90 border-t border-black/50 pointer-events-none" />
          )}
        </div>
      ) : (
        <img
          src={getImageUrl()}
          alt={type}
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
      )}
    </div>
  );
};

export default TableCard;
