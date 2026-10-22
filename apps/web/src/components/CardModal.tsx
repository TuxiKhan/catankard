import React from 'react';
import { X } from 'lucide-react';
import { type CardDetails } from '../lib/cardImages.ts';

interface CardModalProps {
  card: CardDetails | null;
  onClose: () => void;
}

export const CardModal: React.FC<CardModalProps> = ({ card, onClose }) => {
  if (!card) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-800 border-2 border-amber-600 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition"
        >
          <X size={20} />
        </button>

        <div className="w-48 h-72 rounded-xl overflow-hidden shadow-lg border border-slate-600 mb-4 bg-slate-900 flex items-center justify-center">
          <img
            src={card.imageUrl}
            alt={card.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              // Görsel yüklenemezse fallback göster
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <h3 className="text-xl font-bold text-amber-400 text-center mb-1">{card.name}</h3>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 bg-slate-700/60 px-3 py-1 rounded-full">
          {card.category}
        </span>

        {card.cost && (
          <div className="w-full bg-slate-900/80 rounded-lg p-2.5 mb-2 text-sm text-slate-200 flex justify-between">
            <span className="font-semibold text-amber-300">Maliyet:</span>
            <span>{card.cost}</span>
          </div>
        )}

        {card.vp !== undefined && (
          <div className="w-full bg-slate-900/80 rounded-lg p-2.5 mb-3 text-sm text-slate-200 flex justify-between">
            <span className="font-semibold text-amber-300">Zafer Puanı:</span>
            <span className="text-yellow-400 font-bold">+{card.vp} ZP</span>
          </div>
        )}

        <p className="text-sm text-slate-300 text-center leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
          {card.description}
        </p>
      </div>
    </div>
  );
};
