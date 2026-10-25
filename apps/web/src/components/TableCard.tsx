import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderOpen, X } from 'lucide-react';
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
  /** Sadece kart başlığının göründüğü, tıklanınca klasör penceresi olarak açılan mod */
  folderMode?: boolean;
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
    ? Math.round(145 * scale)
    : Math.round(effectiveBaseWidth * scale);
  const fullBonusH = Math.round(cardW / (186 / 120));
  const cardH = folderMode
    ? Math.max(18, Math.round(194 * scale * 0.24))
    : Math.round(effectiveBaseHeight * scale);

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
      setIsFolderOpen(true);
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
      setIsFolderOpen(true);
    } else {
      onInspect?.(type);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggable) {
      // Çift tıklandığında konumu orijinal yerine sıfırla
      onPositionChange?.({ x: 0, y: 0 });
    } else if (folderMode) {
      setIsFolderOpen(true);
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

  const folderTitle =
    type === 'longest_route'
      ? 'En Uzun Yol (+2 ZP)'
      : type === 'largest_army'
      ? 'En Güçlü Ordu (+2 ZP)'
      : type === 'road'
      ? 'Yol Kartı'
      : 'Şövalye Kartı';

  return (
    <>
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
          zIndex: isDragging ? 100 : (zIndex ?? (hasCustomPos ? 5 : 1)),
          touchAction: isDraggable ? 'none' : 'auto',
        }}
        className={`relative select-none ${
          folderMode ? 'rounded-t-md' : 'rounded-md sm:rounded-lg'
        } overflow-hidden shadow-lg border border-black/40 bg-stone-900 transition-shadow ${
          isDragging
            ? 'cursor-grabbing scale-105 shadow-2xl z-50 ring-2 ring-sky-400 transition-none'
            : isDraggable
            ? 'cursor-grab hover:scale-[1.02] hover:shadow-2xl'
            : 'cursor-pointer hover:scale-[1.03] active:scale-95 hover:shadow-xl'
        } ${className}`}
      >
        {folderMode && isBonus ? (
          <>
            <img
              src={getImageUrl()}
              alt={type}
              style={{
                width: `${cardW}px`,
                height: `${fullBonusH}px`,
                marginTop: `-${Math.round(fullBonusH * 0.45)}px`,
              }}
              className="object-contain pointer-events-none select-none"
              draggable={false}
            />
            <div className="absolute bottom-0 inset-x-0 h-[3px] rounded-b-sm bg-gradient-to-r from-amber-700/90 via-amber-400/90 to-amber-700/90 border-t border-black/50 pointer-events-none" />
          </>
        ) : (
          <img
            src={getImageUrl()}
            alt={type}
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        )}
      </div>

      {/* KLASÖR AÇILIR PENCERE (Tıklandığında tam kartı gösterir) */}
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

              <div className="flex items-center justify-center py-1 px-1">
                <div
                  onClick={() => {
                    setIsFolderOpen(false);
                    onInspect?.(type);
                  }}
                  style={
                    isBonus
                      ? { width: '230px', height: '148px' }
                      : { width: '115px', height: '178px' }
                  }
                  className="shrink-0 rounded-lg overflow-hidden border border-amber-400/50 shadow-xl cursor-pointer hover:scale-105 transition-transform bg-stone-900"
                >
                  <img
                    src={getImageUrl()}
                    alt={type}
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default TableCard;
