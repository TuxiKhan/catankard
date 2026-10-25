import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderOpen, X } from 'lucide-react';
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
  /** Sadece kart başlıklarının göründüğü, tıklanınca klasör penceresi olarak açılan mod */
  folderMode?: boolean;
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
 * üzerine tıklanana kadar kapalı klasör gibi durur, tıklandığında klasör penceresi açılır.
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

  if (count <= 0) return null;

  const cardW = Math.round(baseWidth * scale);
  const cardH = Math.round(baseHeight * scale);

  // Kapalı klasör modunda yalnızca başlık şeritleri gözükür
  const topHeaderH = Math.max(18, Math.round(cardH * 0.24));
  const folderStepH =
    count > 1
      ? Math.min(
          Math.max(10, Math.round(cardH * 0.16)),
          Math.max(7, Math.floor(Math.round(cardH * 0.42) / (count - 1)))
        )
      : 0;
  const folderTotalH = topHeaderH + (count - 1) * folderStepH;

  // Normal modda dikey basamak yüksekliği
  const maxExtraH = Math.round(64 * scale);
  const rawOffset = Math.round(layerOffset * scale);
  const offset =
    count > 1
      ? Math.min(rawOffset, Math.max(Math.round(8 * scale), Math.floor(maxExtraH / (count - 1))))
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
    e.stopPropagation();
    if (folderMode) {
      setIsFolderOpen(true);
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

  const folderTitle = type === 'road' ? 'Yol İstifi' : 'Şövalye İstifi';

  return (
    <>
      <div
        ref={cardRef}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          if (folderMode) {
            setIsFolderOpen(true);
          } else {
            onInspect?.(type);
          }
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
            : 'cursor-pointer hover:scale-[1.03] active:scale-95'
        } ${className}`}
      >
        {folderMode ? (
          <>
            {Array.from({ length: count }).map((_, i) => {
              const isTop = i === count - 1;
              const topPx = i * folderStepH;
              const sliceH = isTop ? topHeaderH : folderStepH + 4;

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
                  className="absolute rounded-t-md overflow-hidden border border-black/45 shadow-md bg-stone-900"
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
            {/* Klasör alt dudak çizgisi */}
            <div
              style={{ zIndex: count + 2 }}
              className="absolute bottom-0 inset-x-0 h-[3px] rounded-b-sm bg-gradient-to-r from-amber-700/90 via-amber-400/90 to-amber-700/90 border-t border-black/50 pointer-events-none"
            />
          </>
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
                {Array.from({ length: count }).map((_, i) => (
                  <div
                    key={`${idPrefix}-open-${i}`}
                    onClick={() => {
                      setIsFolderOpen(false);
                      onInspect?.(type);
                    }}
                    style={{ width: '115px', height: '178px' }}
                    className="shrink-0 rounded-lg overflow-hidden border border-amber-400/50 shadow-xl cursor-pointer hover:scale-105 transition-transform bg-stone-900"
                  >
                    <img
                      src={getCardImageUrl(i)}
                      alt={type === 'road' ? 'Yol' : 'Şövalye'}
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
