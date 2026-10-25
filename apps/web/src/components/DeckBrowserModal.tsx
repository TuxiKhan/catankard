import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { assetUrl } from '../lib/assetUrl.ts';

export type DeckType = 'resource' | 'event' | 'metropolis' | 'building';

export interface DeckBrowserModalProps {
  deckType: DeckType | null;
  onClose: () => void;
  metropolisSide?: 'A' | 'B';
  remainingCount?: number;
  deckTitle?: string;
}

interface DeckCardItem {
  id: string;
  imageUrl: string;
  alt: string;
}

const DECK_TITLES: Record<DeckType, string> = {
  resource: 'Kaynak Destesi',
  event: 'Olay Destesi',
  metropolis: 'Büyükşehir Destesi',
  building: 'İnşaat Destesi',
};

const DECK_CARDS: Record<DeckType, DeckCardItem[]> = {
  resource: [
    { id: 'brick', imageUrl: assetUrl('/assets/cards/resource/resource_brick.png'), alt: 'Tuğla' },
    { id: 'wood', imageUrl: assetUrl('/assets/cards/resource/resource_wood.png'), alt: 'Odun' },
    { id: 'wool', imageUrl: assetUrl('/assets/cards/resource/resource_wool.png'), alt: 'Yün' },
    { id: 'wheat', imageUrl: assetUrl('/assets/cards/resource/resource_wheat.png'), alt: 'Buğday' },
    { id: 'ore', imageUrl: assetUrl('/assets/cards/resource/resource_ore.png'), alt: 'Demir' },
  ],
  event: [
    { id: 'robber', imageUrl: assetUrl('/assets/cards/event/event_robber.png'), alt: 'Hırsız' },
    { id: 'solstice', imageUrl: assetUrl('/assets/cards/event/event_solstice.png'), alt: 'Yeni Yıl' },
    { id: 'abundance', imageUrl: assetUrl('/assets/cards/event/event_abundance.png'), alt: 'Bolluk' },
    { id: 'subsidy', imageUrl: assetUrl('/assets/cards/event/event_subsidy.png'), alt: 'Hasat Kutlaması' },
    { id: 'charity', imageUrl: assetUrl('/assets/cards/event/event_charity.png'), alt: 'Sadaka' },
  ],
  metropolis: [
    { id: 'metro_A', imageUrl: assetUrl('/assets/cards/building/metropolis_A.png'), alt: 'Metropolis A' },
    { id: 'metro_B_knights', imageUrl: assetUrl('/assets/cards/building/metropolis_B_knights.png'), alt: 'Metropolis B - Şövalyeler' },
    { id: 'metro_B_roads', imageUrl: assetUrl('/assets/cards/building/metropolis_B_roads.png'), alt: 'Metropolis B - Yollar' },
    { id: 'metro_B_longest_route', imageUrl: assetUrl('/assets/cards/building/metropolis_B_longest_route.png'), alt: 'Metropolis B - En Uzun Yol' },
    { id: 'metro_B_largest_army', imageUrl: assetUrl('/assets/cards/building/metropolis_B_largest_army.png'), alt: 'Metropolis B - En Güçlü Ordu' },
  ],
  building: [
    { id: 'road', imageUrl: assetUrl('/assets/cards/building/building_road.png'), alt: 'Yol' },
    { id: 'settlement', imageUrl: assetUrl('/assets/cards/building/building_settlement.png'), alt: 'Köy' },
    { id: 'city', imageUrl: assetUrl('/assets/cards/building/building_city.png'), alt: 'Şehir' },
    { id: 'knight', imageUrl: assetUrl('/assets/cards/building/building_knight.png'), alt: 'Şövalye' },
  ],
};

export const DeckBrowserModal: React.FC<DeckBrowserModalProps> = ({
  deckType,
  onClose,
  metropolisSide,
  remainingCount,
  deckTitle,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!deckType) return null;

  let cards = DECK_CARDS[deckType] ?? [];
  if (deckType === 'metropolis') {
    if (metropolisSide === 'A') {
      cards = cards.filter((c) => c.id === 'metro_A');
    } else if (metropolisSide === 'B') {
      cards = cards.filter((c) =>
        [
          'metro_B_knights',
          'metro_B_roads',
          'metro_B_longest_route',
          'metro_B_largest_army',
        ].includes(c.id)
      );
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current && e.deltaY !== 0) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const title = deckTitle || DECK_TITLES[deckType];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-5 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[95vw] sm:max-w-4xl bg-slate-950/90 border border-amber-500/40 rounded-2xl p-2.5 sm:p-5 shadow-2xl flex flex-col gap-2 sm:gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Üst Bilgi & Kapatma Tuşu Barı */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 px-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-amber-300 font-black text-xs sm:text-base tracking-wide">
              {title}
            </span>
            {typeof remainingCount === 'number' && (
              <span className="bg-amber-500/20 border border-amber-400/50 text-amber-200 font-bold text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full">
                Destede {remainingCount} Kart Kaldı
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 bg-red-600/90 hover:bg-red-500 text-white font-bold text-xs sm:text-sm px-3 py-1 sm:py-1.5 rounded-xl transition shadow-lg shrink-0"
            title="Kapat (ESC)"
          >
            <X size={16} />
            <span>Kapat</span>
          </button>
        </div>

        {/* Yatay Kart Gezinme Alanı (Kaydırma butonları kaldırıldı, parmak/fare ile akıcı kaydırma ve sabit kart oranı) */}
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className={`overflow-x-auto flex items-center gap-2.5 sm:gap-4 px-2 py-1.5 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent max-w-full cursor-grab active:cursor-grabbing ${
            cards.length <= 4 ? 'sm:justify-center' : ''
          }`}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              className="shrink-0 w-[135px] h-[210px] sm:w-[195px] sm:h-[302px] rounded-xl overflow-hidden border border-white/15 bg-stone-900 shadow-xl transition-transform hover:scale-[1.03] duration-150 flex flex-col items-center justify-center"
            >
              <img
                src={card.imageUrl}
                alt={card.alt}
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeckBrowserModal;
