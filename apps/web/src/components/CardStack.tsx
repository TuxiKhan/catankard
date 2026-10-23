import React from 'react';
import type {
  BuildingType,
  MetropolisBKind,
  SettlementStack,
} from '@catankard/engine';
import { Eye, Hammer } from 'lucide-react';
import {
  getBuildingImageUrl,
  getMetropolisImageUrl,
} from '../lib/cardImages.ts';

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
}) => {
  const inspectFn = onInspectCard || onInspect;
  const selectFn = onSelectUpgrade || onSelect;

  // Boyut hesaplamaları
  const baseScale = scale ?? (size === 'sm' ? 0.82 : size === 'lg' ? 1.2 : 1);
  const cardW = Math.round(90 * baseScale);
  const cardH = Math.round(130 * baseScale);
  const offset = Math.round(28 * baseScale);

  const { top, metropolis } = stack;
  const hasCity = top === 'city' || top === 'metropolis';
  const hasMetropolis = top === 'metropolis';

  // Toplam katman sayısı ve konteyner yüksekliği
  const layerCount = hasMetropolis ? 3 : hasCity ? 2 : 1;
  const totalHeight = cardH + (layerCount - 1) * offset;

  // En üstteki geçerli Zafer Puanı
  const currentVP = hasMetropolis ? 3 : hasCity ? 2 : 1;

  const handleClick = (e: React.MouseEvent) => {
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

  return (
    <div
      onClick={handleClick}
      style={{
        width: `${cardW}px`,
        height: `${totalHeight}px`,
      }}
      className={`relative group select-none transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'scale-105 z-20'
          : isSelectable
          ? 'hover:scale-[1.03] z-10'
          : 'hover:scale-[1.02]'
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

        {/* Köy Üst Başlık Şeridi (Şehir gelse bile açıkta kalan ~28px kısım) */}
        <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-amber-950/95 via-amber-900/90 to-transparent p-1 flex items-center justify-between pointer-events-none">
          <span className="font-black tracking-wide text-amber-200 uppercase text-[9px]">
            Köy
          </span>
          <span className="bg-red-700 text-white font-extrabold text-[8px] px-1 py-0.2 rounded-full shadow-xs">
            1 ZP
          </span>
        </div>
      </div>

      {/* 2. KATMAN: ŞEHİR KARTI (Köyün üstüne ~28px aşağı kaydırılarak biner) */}
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

          {/* Şehir Üst Başlık Şeridi (Büyükşehir gelse bile açıkta kalan ~28px kısım) */}
          <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-blue-950/95 via-blue-900/90 to-transparent p-1 flex items-center justify-between pointer-events-none">
            <span className="font-black tracking-wide text-sky-200 uppercase text-[9px]">
              Şehir
            </span>
            <span className="bg-amber-500 text-slate-950 font-black text-[8px] px-1 py-0.2 rounded-full shadow-xs">
              2 ZP
            </span>
          </div>
        </div>
      )}

      {/* 3. KATMAN: BÜYÜKŞEHİR KARTI (Şehrin üzerine bir ~28px daha kaydırılarak biner) */}
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
          <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-purple-950/95 via-purple-900/90 to-transparent p-1 flex items-center justify-between pointer-events-none">
            <span className="font-black tracking-wide text-purple-200 uppercase truncate text-[9px]">
              B.Şehir
            </span>
            <span className="bg-purple-500 text-white font-black text-[8px] px-1 py-0.2 rounded-full shadow-xs">
              3 ZP
            </span>
          </div>
        </div>
      )}

      {/* KATMAN ETİKETİ & İNCELE BUTONU (Sağ alt köşe mühür) */}
      <div
        className="absolute bottom-1 right-1 z-10 flex items-center gap-1 bg-slate-950/90 backdrop-blur-xs border border-amber-500/40 rounded-md px-1.5 py-0.5 shadow-md"
        onClick={handleInspectTop}
      >
        <span className="text-[10px] font-black text-amber-300">
          ★ {currentVP}
        </span>
        <Eye size={12} className="text-slate-400 hover:text-amber-300 transition" />
      </div>

      {/* YÜKSELTME SEÇİMİ AURA / ETİKETİ */}
      {isSelectable && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-emerald-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-lg border border-emerald-300 flex items-center gap-1 animate-bounce">
          <Hammer size={10} />
          <span>Yükselt</span>
        </div>
      )}
    </div>
  );
};
