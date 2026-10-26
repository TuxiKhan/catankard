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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-6 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      {/* Kapat Butonu */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20 text-white/80 hover:text-white bg-white/15 hover:bg-white/25 p-1.5 sm:p-2 rounded-full transition shadow-lg"
        title="Kapat (ESC)"
      >
        <X size={24} />
      </button>

      {/* Yatay Kart Gezinme Karuseli (Etrafında kutu/çerçeve olmadan sadece saf kartlar) */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        onClick={(e) => e.stopPropagation()}
        className={`overflow-x-auto flex items-center gap-3 sm:gap-6 px-4 py-2 sm:p-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent max-w-full cursor-grab active:cursor-grabbing select-none ${
          cards.length <= 1 ? 'justify-center' : ''
        }`}
      >
        {cards.map((card) => (
          <img
            key={card.id}
            src={card.imageUrl}
            alt={card.alt}
            style={{
              height: 'min(76dvh, 420px)',
              aspectRatio: '125 / 194',
            }}
            className="shrink-0 object-contain pointer-events-none drop-shadow-2xl transition-transform hover:scale-105 duration-200"
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
};

export default DeckBrowserModal;
