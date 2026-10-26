import React, { useEffect } from 'react';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none cursor-pointer"
      onClick={onClose}
    >
      <img
        src={card.imageUrl}
        alt={card.name}
        className="max-h-[84dvh] max-w-[88vw] sm:max-h-[85vh] object-contain select-none pointer-events-none drop-shadow-[0_12px_36px_rgba(0,0,0,0.85)] animate-in zoom-in-95 duration-150"
        draggable={false}
      />
    </div>
  );
};
