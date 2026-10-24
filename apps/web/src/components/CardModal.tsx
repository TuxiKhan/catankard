import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { type CardDetails } from '../lib/cardImages.ts';

interface CardModalProps {
  card: CardDetails | null;
  onClose: () => void;
}

export const CardModal: React.FC<CardModalProps> = ({ card, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!card) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none cursor-pointer"
      onClick={onClose}
    >
      {/* Kapat Butonu (Özellikle mobilde belirgin dokunma hedefi) */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 text-white/80 hover:text-white bg-white/10 hover:bg-white/25 active:scale-95 p-2.5 rounded-full backdrop-blur-md border border-white/20 shadow-2xl transition"
        title="Kapat (ESC veya Dokun)"
      >
        <X size={24} />
      </button>

      <div className="relative flex flex-col items-center max-h-[85vh] max-w-[90vw] animate-in zoom-in-95 duration-200">
        <img
          src={card.imageUrl}
          alt={card.name}
          className="max-h-[75vh] max-w-[85vw] sm:max-h-[82vh] rounded-2xl shadow-2xl object-contain select-none pointer-events-none drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
        />

        {/* Kart Başlığı Rozeti */}
        <div className="mt-3 px-4 py-1.5 rounded-full bg-black/80 border border-white/20 text-white text-xs sm:text-sm font-bold shadow-lg backdrop-blur-sm pointer-events-none">
          {card.name}
        </div>
      </div>
    </div>
  );
};
