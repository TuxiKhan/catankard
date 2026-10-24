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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none cursor-pointer"
      onClick={onClose}
    >
      <img
        src={card.imageUrl}
        alt={card.name}
        className="max-h-[85vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain select-none transition-transform hover:scale-[1.01]"
        onClick={onClose}
      />
    </div>
  );
};
