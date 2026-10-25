import React, { useRef, useState } from 'react';
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

export interface CardStackProps {
  /** Yığın bilgisi (Köy, Şehir, Büyükşehir) */
  stack: SettlementStack;
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
  const inspectFn = onInspectCard || onInspect;
  const selectFn = onSelectUpgrade || onSelect;

  // Taban boyutları büyütüldü: ~125px x 186px
  const effectiveScale = scale ?? (size === 'sm' ? 0.8 : size === 'lg' ? 1.2 : 1);
  const cardW = Math.round(baseWidth * effectiveScale);
  const cardH = Math.round(baseHeight * effectiveScale);
  const offset = Math.round(layerOffset * effectiveScale);

  const { top, metropolis } = stack;
  const hasCity = top === 'city' || top === 'metropolis';
  const hasMetropolis = top === 'metropolis';

  // Toplam katman sayısı ve konteyner yüksekliği
  const layerCount = hasMetropolis ? 3 : hasCity ? 2 : 1;
  const totalHeight = cardH + (layerCount - 1) * offset;

  // Köy kartı resmi (Masada her zaman orijinal köy kartı kullanılır)
  const getSettlementImgUrl = (): string => {
    return getBuildingImageUrl('settlement');
  };

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

  const triggerInspect = () => {
    if (inspectFn) {
      if (hasMetropolis && metropolis) {
        inspectFn('metropolis', metropolis.kind);
      } else {
        inspectFn(top);
      }
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

    // Mobilde veya dokunmatikte uzun basarak (400ms) kart detayını inceleme
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
    if (e.button !== 0) return; // Sadece sol tık

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
    if (isSelectable && selectFn) {
      selectFn(stack.id);
    } else if (!isDraggable && inspectFn) {
      triggerInspect();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerInspect();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggable) {
      onPositionChange?.({ x: 0, y: 0 });
    } else if (inspectFn) {
      triggerInspect();
    }
  };

  const currentX = isDraggable ? (initialPosRef.current.x + dragOffset.x) : 0;
  const currentY = isDraggable ? (initialPosRef.current.y + dragOffset.y) : 0;
  const hasCustomPos = currentX !== 0 || currentY !== 0;

  const transformStyle = hasCustomPos
    ? `translate3d(${currentX}px, ${currentY}px, 0)`
    : undefined;

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
        zIndex: isDragging ? 100 : (zIndex ?? (isSelected ? 20 : isSelectable ? 10 : hasCustomPos ? 5 : 1)),
        touchAction: isDraggable ? 'none' : 'auto',
      }}
      className={`relative select-none ${
        isDragging
          ? 'cursor-grabbing scale-105 shadow-2xl z-50 ring-2 ring-sky-400 transition-none'
          : isDraggable
          ? 'cursor-grab hover:scale-[1.02]'
          : 'cursor-pointer hover:scale-[1.02]'
      } ${
        isSelected
          ? 'ring-4 ring-sky-400 shadow-sky-500/40 shadow-2xl rounded-xl'
          : isSelectable
          ? 'ring-2 ring-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.7)] animate-pulse rounded-xl'
          : ''
      } ${className}`}
    >
      {/* 1. KATMAN: KÖY KARTI (En Altta, Sabit top: 0) */}
      <div
        style={{
          width: `${cardW}px`,
          height: `${cardH}px`,
          top: 0,
          left: 0,
          zIndex: 1,
        }}
        className={`absolute rounded-xl overflow-hidden border border-black/30 shadow-lg ${
          isSelected || isSelectable
            ? 'border-sky-400'
            : ''
        }`}
      >
        <img
          src={getSettlementImgUrl()}
          alt="Köy"
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      </div>

      {/* 2. KATMAN: ŞEHİR KARTI (Köyün üstüne offset px aşağı kaydırılarak biner) */}
      {hasCity && (
        <div
          style={{
            width: `${cardW}px`,
            height: `${cardH}px`,
            top: `${offset}px`,
            left: 0,
            zIndex: 2,
          }}
          className={`absolute rounded-xl overflow-hidden border border-black/30 shadow-xl ${
            isSelected
              ? 'border-yellow-400'
              : isSelectable
              ? 'border-emerald-400'
              : ''
          }`}
        >
          <img
            src={getBuildingImageUrl('city')}
            alt="Şehir"
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* 3. KATMAN: BÜYÜKŞEHİR KARTI (Şehrin üzerine offset * 2 px aşağı kaydırılarak biner) */}
      {hasMetropolis && (
        <div
          style={{
            width: `${cardW}px`,
            height: `${cardH}px`,
            top: `${offset * 2}px`,
            left: 0,
            zIndex: 3,
          }}
          className={`absolute rounded-xl overflow-hidden border border-black/30 shadow-2xl ${
            isSelected || isSelectable
              ? 'border-sky-400'
              : ''
          }`}
        >
          <img
            src={
              metropolis
                ? getMetropolisImageUrl(metropolis)
                : assetUrl('/assets/cards/building/metropolis_A.png')
            }
            alt="Büyükşehir"
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CardStack;
