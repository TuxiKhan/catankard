import React, { useEffect, useState } from 'react';
import type { EventKind } from '@catankard/engine';
import { getEventImageUrl } from '../lib/cardImages.ts';

export interface EventCelebrationProps {
  event: EventKind | null;
  onClose: () => void;
}

const EVENT_INFO: Record<
  EventKind,
  { title: string; subtitle: string; desc: string; color: string; badgeBg: string; borderColor: string }
> = {
  robber: {
    title: 'HIRSIZ!',
    subtitle: 'El Limiti Aşımı Kontrol Ediliyor',
    desc: 'Elinizde 7\'den fazla kaynak varsa (şövalyeler hariç), elinizdeki kartların yarısını (aşağı yuvarlanır) seçip atmalısınız!',
    color: '#ef4444',
    badgeBg: 'bg-red-600',
    borderColor: 'border-red-500',
  },
  solstice: {
    title: 'YENİ YIL / GÜNDÖNÜMÜ',
    subtitle: 'Olay Destesi Yenileniyor',
    desc: 'Her oyuncu kaynak destesinden 1 kaynak çeker. Ardından tüm olay kartları karıştırılıp yeni olay destesi oluşturulur!',
    color: '#eab308',
    badgeBg: 'bg-amber-500',
    borderColor: 'border-amber-400',
  },
  abundance: {
    title: 'BOLLUK / TEŞVİK',
    subtitle: 'Kaynak Yardımı',
    desc: 'En Uzun Yol ve En Büyük Ordu kartına sahip OLMAYAN her oyuncu kaynak destesinden 2 bonus kaynak kartı çeker!',
    color: '#22c55e',
    badgeBg: 'bg-emerald-600',
    borderColor: 'border-emerald-400',
  },
  subsidy: {
    title: 'HASAT KUTLAMASI',
    subtitle: 'Köy Başına Kaynak',
    desc: 'Her oyuncu, önündeki açık her Köyü için kaynak destesinden 1 kaynak kartı çeker (Şehre dönüşenler sayılmaz)!',
    color: '#38bdf8',
    badgeBg: 'bg-sky-500',
    borderColor: 'border-sky-400',
  },
  charity: {
    title: 'SADAKA',
    subtitle: 'Dayanışma Zamanı',
    desc: 'En çok Zafer Puanına sahip oyuncular, kendisinden daha az puanı olan bir oyuncuya elinden 1 kaynak kartı hediye eder!',
    color: '#a855f7',
    badgeBg: 'bg-purple-600',
    borderColor: 'border-purple-400',
  },
};

export const EventCelebrationModal: React.FC<EventCelebrationProps> = ({ event, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!event) {
      setVisible(false);
      return;
    }

    setVisible(true);
    // Otomatik kapanma: 5.5 saniye sonra veya kullanıcı tıkladığında
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 5500);

    return () => clearTimeout(timer);
  }, [event, onClose]);

  if (!event || !visible) return null;

  const info = EVENT_INFO[event];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300 select-none cursor-pointer"
      onClick={() => {
        setVisible(false);
        setTimeout(onClose, 250);
      }}
    >
      <div
        className="relative flex flex-col items-center max-w-sm sm:max-w-md w-full p-6 text-center rounded-3xl bg-slate-950/95 border-2 shadow-[0_0_60px_rgba(0,0,0,0.9)] transition-all animate-in zoom-in-75 duration-300"
        style={{ borderColor: info.color }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Üst Rozet */}
        <div
          className={`px-4 py-1 rounded-full text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg mb-3 ${info.badgeBg}`}
        >
          ⚡ Olay Tetiklendi
        </div>

        {/* Başlık */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide mb-1">
          {info.title}
        </h2>
        <span className="text-xs font-semibold text-slate-400 mb-4 tracking-wider uppercase">
          {info.subtitle}
        </span>

        {/* Gerçek Olay Kartı Görseli (Büyük ve Canlı Çerçeveli) */}
        <div className="relative group my-2">
          <div
            className="absolute -inset-2 rounded-2xl opacity-75 blur-lg transition duration-500 group-hover:opacity-100 animate-pulse"
            style={{ backgroundColor: info.color }}
          />
          <div className="relative w-[130px] h-[200px] sm:w-[155px] sm:h-[240px] rounded-xl overflow-hidden border-2 shadow-2xl bg-slate-900 border-white/80 transform hover:scale-105 transition-transform duration-300">
            <img
              src={getEventImageUrl(event)}
              alt={info.title}
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
          </div>
        </div>

        {/* Olayın Etkisi & Açıklaması */}
        <p className="text-xs sm:text-sm text-slate-200 mt-4 leading-relaxed font-medium bg-black/40 border border-white/10 rounded-2xl p-3.5 w-full">
          {info.desc}
        </p>

        {/* Devam Et Butonu */}
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 250);
          }}
          className="mt-4 px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-wider transition border border-white/20 active:scale-95"
        >
          Devam Et
        </button>
      </div>
    </div>
  );
};
