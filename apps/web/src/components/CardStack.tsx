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
  /** Sürükleme durumu değiştiğinde tetiklenir */
  onDragChange?: (isDragging: boolean) => void;
  /** Güvenli masa alanı sınırlandırma (Boundary Clamping) fonksiyonu */
  clampPosition?: (pos: CardPosition) => CardPosition;
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
  baseHeight = 186,
  layerOffset = 36,
  className = '',
  isDraggable = false,
  position,
  onPositionChange,
  onDragChange,
  clampPosition,
}) => {
  const inspectFn = onInspectCard || onInspect;
  const selectFn = onSelectUpgrade || onSelect;

  // Taban boyutları büyütüldü: ~125px x 186px
  const effectiveScale = scale ?? (size === 'sm' ? 0.8 : size === 'lg' ? 1.2 : 1);
  const cardW = Math.round(baseWidth * effectiveScale);
  const cardH = Math.round(baseHeight * effectiveScale);
  const offset = Math.round(layerOffset * effectiveScale);

  const { top, metropolis, isStarting, isStartingPlayerCard } = stack;
  const hasCity = top === 'city' || top === 'metropolis';
  const hasMetropolis = top === 'metropolis';

  // Toplam katman sayısı ve konteyner yüksekliği
  const layerCount = hasMetropolis ? 3 : hasCity ? 2 : 1;
  const totalHeight = cardH + (layerCount - 1) * offset;

  // Başlangıç köyü resmi
  const getSettlementImgUrl = (): string => {
    if (isStarting) {
      return isStartingPlayerCard
        ? '/assets/cards/starting/starting_settlement_front_starting_player.png'
        : '/assets/cards/starting/starting_settlement_front.png';
    }
    return getBuildingImageUrl('settlement');
  };

  // Sürükle-bırak durumları
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
    if (isSelectable && selectFn) {
      selectFn(stack.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (inspectFn) {
      if (hasMetropolis && metropolis) {
        inspectFn('metropolis', metropolis.kind);
      } else {
        inspectFn(top);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDraggable) {
      onPositionChange?.({ x: 0, y: 0 });
    } else if (inspectFn) {
      if (hasMetropolis && metropolis) {
        inspectFn('metropolis', metropolis.kind);
      } else {
        inspectFn(top);
      }
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
        zIndex: isDragging ? 50 : isSelected ? 20 : isSelectable ? 10 : hasCustomPos ? 5 : 1,
        touchAction: isDraggable ? 'none' : 'auto',
      }}
      className={`relative select-none ${
        isDragging
          ? 'cursor-grabbing scale-105 shadow-2xl z-50 ring-2 ring-sky-400 transition-none'
          : isDraggable
          ? 'cursor-grab hover:scale-[1.02] transition-transform duration-100'
          : 'cursor-pointer hover:scale-[1.02] transition-all duration-150'
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
        {/* Başlangıç köyü (ilk oyuncu olmayan) için parşömen metni */}
        {isStarting && !isStartingPlayerCard && (
          <div className="absolute bottom-[18px] sm:bottom-[22px] inset-x-0 text-center font-bold text-stone-900 text-xs sm:text-sm tracking-wide select-none pointer-events-none">
            İlk Köy
          </div>
        )}
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
                : '/assets/cards/building/metropolis_A.png'
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
