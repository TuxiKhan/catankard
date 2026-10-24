import React, { useRef, useState } from 'react';
import type {
  BuildingType,
  MetropolisBKind,
  SettlementStack,
} from '@catankard/engine';
import { Eye, Hammer, Move } from 'lucide-react';
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
  /** Boyut modu: sm (kompakt), md (varsayılan), lg (büyük) */
  size?: 'sm' | 'md' | 'lg';
  /** Boyutlandırma çarpanı (örn: 0.85, 1) */
  scale?: number;
  /** Ek Tailwind sınıfları */
  className?: string;

  /** Serbest sürüklenebilir mi? (Aktif oyuncunun kendi kartları için) */
  isDraggable?: boolean;
  /** Masadaki mevcut koordinat konumu */
  position?: CardPosition;
  /** Konum değiştiğinde çağrılır */
  onPositionChange?: (pos: CardPosition) => void;
  /** Sürükleme durumu değiştiğinde tetiklenir (aktif oyuncu yasak bölge kılavuzu için) */
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
  size = 'md',
  scale,
  className = '',
  isDraggable = false,
  position,
  onPositionChange,
  onDragChange,
  clampPosition,
}) => {
  const inspectFn = onInspectCard || onInspect;
  const selectFn = onSelectUpgrade || onSelect;

  // Taban boyutları büyütüldü: 90x130 px -> 110x160 px
  const baseScale = scale ?? (size === 'sm' ? 0.82 : size === 'lg' ? 1.2 : 1);
  const cardW = Math.round(110 * baseScale);
  const cardH = Math.round(160 * baseScale);
  const offset = Math.round(34 * baseScale);

  const { top, metropolis } = stack;
  const hasCity = top === 'city' || top === 'metropolis';
  const hasMetropolis = top === 'metropolis';

  // Toplam katman sayısı ve konteyner yüksekliği
  const layerCount = hasMetropolis ? 3 : hasCity ? 2 : 1;
  const totalHeight = cardH + (layerCount - 1) * offset;

  // En üstteki geçerli Zafer Puanı
  const currentVP = hasMetropolis ? 3 : hasCity ? 2 : 1;

  // Sürükle-bırak durumları
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<CardPosition>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const justDraggedRef = useRef<boolean>(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggable) return;
    if (e.button !== 0) return; // Sadece sol tık

    // Buton veya incele tıklandıysa sürükleme başlatma
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[data-no-drag="true"]')) {
      return;
    }

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

    // Tıklama olayının sürükleme sonrasında yutulması
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
    } else if (inspectFn) {
      if (hasMetropolis && metropolis) {
        inspectFn('metropolis', metropolis.kind);
      } else {
        inspectFn(top);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isDraggable) return;
    e.stopPropagation();
    // Çift tıklandığında kartı orijinal masadaki başlangıç konumuna sıfırla
    onPositionChange?.({ x: 0, y: 0 });
  };

  const handleInspectTop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inspectFn) {
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
      title={
        isDraggable
          ? 'Masada serbestçe sürükleyip bırakabilirsiniz (sıfırlamak için çift tıklayın)'
          : undefined
      }
      className={`relative group select-none ${
        isDragging
          ? 'cursor-grabbing scale-[1.04] shadow-2xl z-50 ring-2 ring-amber-400/80 transition-none'
          : isDraggable
          ? 'cursor-grab hover:scale-[1.02] transition-transform duration-75'
          : 'cursor-pointer hover:scale-[1.02] transition-all duration-200'
      } ${
        isSelected
          ? 'scale-105'
          : isSelectable
          ? 'hover:scale-[1.03]'
          : ''
      } ${className}`}
    >
      {/* Sürüklenebilir Kart Rozeti (hover ile görünür ipucu) */}
      {isDraggable && !isDragging && (
        <div
          data-no-drag="true"
          className="absolute -top-2 left-1 z-30 opacity-0 group-hover:opacity-80 transition-opacity bg-black/80 border border-amber-400/40 rounded px-1.5 py-0.5 pointer-events-none text-[8px] text-amber-200 font-mono flex items-center gap-1 shadow-md"
        >
          <Move size={8} className="text-amber-300" />
          <span>Taşı</span>
        </div>
      )}

      {/* 1. KATMAN: KÖY KARTI (En Altta, Sabit top: 0) */}
      <div
        style={{
          width: `${cardW}px`,
          height: `${cardH}px`,
          top: 0,
          left: 0,
          zIndex: 1,
        }}
        className={`absolute rounded-xl overflow-hidden border-2 bg-slate-900 shadow-md transition-shadow ${
          isSelected
            ? 'border-yellow-400 ring-2 ring-yellow-400/80 shadow-yellow-500/20 shadow-xl'
            : isSelectable
            ? 'border-emerald-500 ring-2 ring-emerald-400/50 animate-pulse'
            : 'border-amber-700/80 hover:border-amber-500'
        }`}
      >
        <img
          src={getBuildingImageUrl('settlement')}
          alt="Köy"
          className="w-full h-full object-contain pointer-events-none"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />

        {/* Köy Üst Başlık Şeridi */}
        <div className="absolute top-0 inset-x-0 h-7 bg-gradient-to-b from-amber-950/95 via-amber-900/90 to-transparent p-1.5 flex items-center justify-between pointer-events-none">
          <span className="font-black tracking-wide text-amber-200 uppercase text-[10px]">
            Köy
          </span>
          <span className="bg-red-700 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full shadow-xs">
            1 ZP
          </span>
        </div>
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
          className={`absolute rounded-xl overflow-hidden border-2 bg-slate-900 shadow-lg transition-transform ${
            isSelected
              ? 'border-yellow-400 ring-2 ring-yellow-400/80'
              : isSelectable
              ? 'border-emerald-500 ring-2 ring-emerald-400/50 animate-pulse'
              : 'border-sky-600/90 hover:border-sky-400'
          }`}
        >
          <img
            src={getBuildingImageUrl('city')}
            alt="Şehir"
            className="w-full h-full object-contain pointer-events-none"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />

          {/* Şehir Üst Başlık Şeridi */}
          <div className="absolute top-0 inset-x-0 h-7 bg-gradient-to-b from-blue-950/95 via-blue-900/90 to-transparent p-1.5 flex items-center justify-between pointer-events-none">
            <span className="font-black tracking-wide text-sky-200 uppercase text-[10px]">
              Şehir
            </span>
            <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-xs">
              2 ZP
            </span>
          </div>
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
          className={`absolute rounded-xl overflow-hidden border-2 bg-slate-900 shadow-xl ${
            isSelected
              ? 'border-yellow-400 ring-2 ring-yellow-400/80'
              : 'border-purple-600/90 hover:border-purple-400'
          }`}
        >
          <img
            src={
              metropolis
                ? getMetropolisImageUrl(metropolis)
                : '/assets/cards/building/metropolis_A.png'
            }
            alt="Büyükşehir"
            className="w-full h-full object-contain pointer-events-none"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />

          {/* Büyükşehir Üst Başlık Şeridi */}
          <div className="absolute top-0 inset-x-0 h-7 bg-gradient-to-b from-purple-950/95 via-purple-900/90 to-transparent p-1.5 flex items-center justify-between pointer-events-none">
            <span className="font-black tracking-wide text-purple-200 uppercase truncate text-[10px]">
              B.Şehir
            </span>
            <span className="bg-purple-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-xs">
              3 ZP
            </span>
          </div>
        </div>
      )}

      {/* KATMAN ETİKETİ & İNCELE BUTONU (Sağ alt köşe mühür) */}
      <div
        data-no-drag="true"
        className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-xs border border-amber-500/40 rounded-md px-2 py-0.5 shadow-md cursor-pointer hover:border-amber-400 transition"
        onClick={handleInspectTop}
        onPointerDown={(e) => e.stopPropagation()}
        title="Kartı incele"
      >
        <span className="text-[11px] font-black text-amber-300">
          ★ {currentVP}
        </span>
        <Eye size={13} className="text-slate-400 hover:text-amber-300 transition" />
      </div>

      {/* YÜKSELTME SEÇİMİ AURA / ETİKETİ */}
      {isSelectable && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-lg border border-emerald-300 flex items-center gap-1 animate-bounce">
          <Hammer size={11} />
          <span>Yükselt</span>
        </div>
      )}
    </div>
  );
};

export default CardStack;
