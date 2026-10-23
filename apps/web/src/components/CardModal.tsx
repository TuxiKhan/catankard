import React, { useEffect } from 'react';
import { X, Award, Sparkles, HelpCircle } from 'lucide-react';
import { type CardDetails, getResourceImageUrl } from '../lib/cardImages.ts';
import type { Resource } from '@catankard/engine';

interface CardModalProps {
  card: CardDetails | null;
  onClose: () => void;
}

const RESOURCE_LABELS: Record<Resource, { name: string; color: string; border: string; bg: string }> = {
  brick: { name: 'Tuğla', color: 'text-red-400', border: 'border-red-600/70', bg: 'bg-red-950/60' },
  wood: { name: 'Odun', color: 'text-emerald-400', border: 'border-emerald-600/70', bg: 'bg-emerald-950/60' },
  wool: { name: 'Yün', color: 'text-lime-400', border: 'border-lime-600/70', bg: 'bg-lime-950/60' },
  wheat: { name: 'Buğday', color: 'text-amber-400', border: 'border-amber-600/70', bg: 'bg-amber-950/60' },
  ore: { name: 'Demir', color: 'text-slate-300', border: 'border-slate-500/70', bg: 'bg-slate-800/80' },
};

export const CardModal: React.FC<CardModalProps> = ({ card, onClose }) => {
  // ESC tuşuyla modalı kapat
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* Parşömen Dokulu, Altın Kenarlıklı Merkez Kart Penceresi */}
      <div
        className="relative bg-gradient-to-b from-[#241a14] via-[#1a1410] to-[#2c1f15] border-4 border-amber-500/90 rounded-3xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(245,158,11,0.35)] flex flex-col items-center animate-in zoom-in-95 duration-200 text-slate-100 ring-2 ring-amber-300/40 ring-offset-2 ring-offset-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dekoratif Altın Köşe Detayları */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-400/80 rounded-tl pointer-events-none" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-400/80 rounded-tr pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-400/80 rounded-bl pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-400/80 rounded-br pointer-events-none" />

        {/* Kapat Butonu */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-amber-300 hover:text-white p-1.5 rounded-full bg-amber-950/70 border border-amber-500/50 hover:bg-amber-800 transition shadow-md"
          title="Kapat (ESC)"
        >
          <X size={20} />
        </button>

        {/* Üst Büyük Kart Görseli */}
        <div className="relative w-52 h-76 sm:w-60 sm:h-88 rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/70 mb-4 bg-slate-950 flex items-center justify-center ring-1 ring-amber-300/30">
          <img
            src={card.imageUrl}
            alt={card.name}
            className="w-full h-full object-contain filter drop-shadow-lg"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          {/* Işıltı Yansıması */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-amber-300/10 pointer-events-none" />
        </div>

        {/* Kart Başlığı */}
        <h3 className="text-2xl font-black text-amber-300 text-center tracking-wide mb-1 drop-shadow-sm font-serif">
          {card.name}
        </h3>

        {/* Kategori Etiketi */}
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-200/90 mb-3 bg-amber-950/80 border border-amber-600/60 px-3.5 py-0.5 rounded-full shadow-inner">
          {card.category}
        </span>

        {/* Zafer Puanı Mühür Rozeti (Varsa) */}
        {card.vp !== undefined && card.vp > 0 && (
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-950/80 via-red-900/90 to-red-950/80 border border-red-500/80 rounded-full px-4 py-1 mb-3 shadow-lg shadow-red-950/50 animate-pulse">
            <Award size={16} className="text-yellow-400" />
            <span className="text-xs font-black text-yellow-300 uppercase tracking-wider">
              {card.vp} Zafer Puanı (ZP)
            </span>
          </div>
        )}

        {/* Hammadde Maliyeti Rozetleri */}
        {card.costResources && card.costResources.length > 0 ? (
          <div className="w-full bg-[#18120d]/90 border border-amber-700/50 rounded-xl p-3 mb-2.5 shadow-inner">
            <span className="text-[11px] font-black uppercase text-amber-400 block mb-1.5 tracking-wider">
              Gereksinim / Maliyet:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {card.costResources.map((item, idx) => {
                const info = RESOURCE_LABELS[item.resource];
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${info.border} ${info.bg} shadow-sm`}
                  >
                    <img
                      src={getResourceImageUrl(item.resource)}
                      alt={info.name}
                      className="w-4 h-6 object-contain"
                    />
                    <span className="text-xs font-black text-white">
                      {item.count}x
                    </span>
                    <span className={`text-xs font-bold ${info.color}`}>
                      {info.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : card.cost ? (
          <div className="w-full bg-[#18120d]/90 border border-amber-700/50 rounded-xl p-2.5 mb-2.5 text-xs flex justify-between shadow-inner">
            <span className="font-bold text-amber-400">Maliyet:</span>
            <span className="text-slate-200 font-semibold">{card.cost}</span>
          </div>
        ) : null}

        {/* Kart Etkisi / Aksiyonu (Varsa) */}
        {card.effect && (
          <div className="w-full bg-gradient-to-r from-amber-950/60 to-slate-900/70 border border-amber-600/40 rounded-xl p-2.5 mb-2.5 shadow-sm flex items-start gap-2">
            <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-100 leading-snug">
              <span className="font-black text-amber-300 mr-1">Özel Yetenek:</span>
              <span>{card.effect}</span>
            </div>
          </div>
        )}

        {/* Detaylı Açıklama / Kural Bilgisi */}
        <div className="w-full bg-[#16110d]/80 border border-amber-900/40 rounded-xl p-3 text-xs text-slate-300 leading-relaxed shadow-inner flex items-start gap-2">
          <HelpCircle size={15} className="text-amber-500/70 shrink-0 mt-0.5" />
          <p>{card.description}</p>
        </div>

        {/* Kapatma İpucu */}
        <span className="text-[10px] text-amber-400/60 mt-3 font-medium">
          Kapatmak için dışarıya tıklayın veya ESC tuşuna basın
        </span>
      </div>
    </div>
  );
};
