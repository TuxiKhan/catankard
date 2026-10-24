import React from 'react';
import { ArrowRightLeft, CheckCircle2, Clock } from 'lucide-react';

export interface TableActionButtonsProps {
  /** 3P veya 4P masa düzeni (4P'de alt-ortaya, 3P'de sağ-alta konumlanır) */
  layout?: '3P' | '4P';
  /** Özel konumlandırma seçeneği */
  position?: 'bottom-center' | 'bottom-right';
  /** Ticaret / Takas penceresini açar */
  onOpenTrade: () => void;
  /** Turu bitirme aksiyonu */
  onEndTurn: () => void | Promise<void>;
  /** Sıra mevcut (yerel) oyuncuda mı? */
  isActive: boolean;
  /** İşlem devam ediyor mu (tur bitirme isteği vb.) */
  loading?: boolean;
  /** Bekleyen / açık takas teklif sayısı */
  openTradeOffersCount?: number;
  /** Sıra başka oyuncudaysa onun adı */
  activePlayerName?: string;
  /** Opsiyonel kapsayıcı sınıfı */
  className?: string;
  /** Buton yerleşim yönü: yatay ('horizontal') veya dikey ('vertical') */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Catan temasına uygun 2 adet yuvarlak aksiyon butonu: Ticaret / Takas ve Turu Bitir.
 * 4 kişilik oyunda ekranın alt-ortasında, 3 kişilik oyunda ise sağ-alt köşede yer alır.
 */
export const TableActionButtons: React.FC<TableActionButtonsProps> = ({
  layout: _layout,
  position,
  onOpenTrade,
  onEndTurn,
  isActive,
  loading = false,
  openTradeOffersCount = 0,
  activePlayerName,
  className,
  orientation = 'horizontal',
}) => {
  const isVertical = orientation === 'vertical';

  // İki butonun tam ortası sayfanın yatay merkez çizgisine (%50) oturur
  const isCorner = position === 'bottom-right';
  const defaultPositionClass = isCorner
    ? 'fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-40'
    : 'fixed bottom-1.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-40';

  const containerClass = className || defaultPositionClass;

  return (
    <aside
      aria-label="Oyun Aksiyon Butonları"
      className={`${containerClass} flex flex-col items-center select-none pointer-events-auto`}
    >
      {/* Sıra Başkasındayken: Butonların tam üstünde ortalanmış yüzen bilgi rozeti (Butonların merkezini kaydırmaz) */}
      {!isActive && activePlayerName && (
        <div className="absolute bottom-full mb-1.5 sm:mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-slate-950/90 backdrop-blur-md border border-slate-700/60 shadow-xl text-[10px] sm:text-xs text-sky-200/90 font-medium z-10 pointer-events-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
          </span>
          <span className="truncate max-w-[120px] sm:max-w-[160px]">{activePlayerName} oynuyor...</span>
        </div>
      )}

      {/* Buton Çifti: İki butonun tam ortası sayfanın yatay merkez çizgisine (%50) oturur */}
      <div
        className={`flex ${
          isVertical ? 'flex-col items-center gap-2 sm:gap-3.5' : 'items-center justify-center gap-2.5 sm:gap-4 md:gap-5'
        }`}
      >

      {/* 1. TİCARET / TAKAS BUTONU */}
      <div className="relative group">
        <button
          type="button"
          onClick={onOpenTrade}
          title="Ticaret / Takas"
          aria-label="Ticaret ve Takas Menüsü"
          className="relative w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full aspect-square flex items-center justify-center bg-gradient-to-br from-amber-600 via-amber-700 to-amber-950 text-amber-100 border-2 border-amber-400/90 shadow-[0_4px_14px_rgba(0,0,0,0.65),inset_0_2px_4px_rgba(255,255,255,0.35)] ring-1 ring-amber-300/40 hover:scale-105 active:scale-95 active:shadow-inner hover:border-amber-200 hover:shadow-[0_0_24px_rgba(245,158,11,0.65)] hover:brightness-110 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          {/* Antik altın iç halka oyuğu (Catan madalyon hissi) */}
          <span className="absolute inset-1 rounded-full border border-amber-300/30 pointer-events-none" />

          {/* İkon */}
          <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-amber-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] transition-transform duration-200 group-hover:rotate-12" />

          {/* Açık Takas Teklif Sayısı Rozeti */}
          {openTradeOffersCount > 0 && (
            <span className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 min-w-[18px] sm:min-w-[22px] h-[18px] sm:h-[22px] px-1 sm:px-1.5 bg-gradient-to-r from-red-600 to-rose-600 border-2 border-amber-200 rounded-full text-white text-[9px] sm:text-[11px] font-black flex items-center justify-center shadow-lg animate-bounce">
              {openTradeOffersCount}
            </span>
          )}
        </button>

        {/* Hover Tooltip */}
        <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 whitespace-nowrap z-50">
          <div className="bg-slate-950/95 text-amber-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-500/40 shadow-2xl backdrop-blur-md flex items-center gap-1.5">
            <span>Ticaret / Takas</span>
            {openTradeOffersCount > 0 && (
              <span className="text-red-400 font-bold">({openTradeOffersCount} teklif)</span>
            )}
          </div>
          <div className="w-2 h-2 bg-slate-950 border-r border-b border-amber-500/40 transform rotate-45 mx-auto -mt-1" />
        </div>
      </div>

      {/* 2. TURU BİTİR BUTONU */}
      <div className="relative group">
        {isActive ? (
          <button
            type="button"
            onClick={onEndTurn}
            disabled={loading}
            title="Turu Bitir"
            aria-label="Turu Bitir"
            className="relative w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full aspect-square flex items-center justify-center bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-950 text-white border-2 border-emerald-300/90 shadow-[0_4px_18px_rgba(16,185,129,0.55),inset_0_2px_4px_rgba(255,255,255,0.45)] ring-2 ring-emerald-400/60 hover:scale-105 active:scale-95 active:shadow-inner hover:border-emerald-200 hover:shadow-[0_0_28px_rgba(16,185,129,0.85)] hover:brightness-110 transition-all duration-200 cursor-pointer animate-pulse focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Zümrüt madalyon iç halka */}
            <span className="absolute inset-1 rounded-full border border-emerald-200/40 pointer-events-none" />

            {/* Arka plan parıldama pürüzsüz dalgası */}
            <span className="absolute -inset-1 rounded-full bg-emerald-400/25 animate-ping pointer-events-none" />

            {/* İkon */}
            <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)] transition-transform duration-200 group-hover:scale-110" />
          </button>
        ) : (
          <button
            type="button"
            disabled
            title={activePlayerName ? `${activePlayerName} oynuyor...` : 'Sıra bekleniyor'}
            aria-label="Sıra Bekleniyor"
            className="relative w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full aspect-square flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 text-slate-400 border-2 border-slate-700/60 shadow-lg cursor-not-allowed opacity-65 transition-all duration-200"
          >
            {/* İç halka */}
            <span className="absolute inset-1 rounded-full border border-white/5 pointer-events-none" />

            {/* Bekleme İkonu */}
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-slate-400/70" />
          </button>
        )}

        {/* Hover Tooltip */}
        <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 whitespace-nowrap z-50">
          <div className="bg-slate-950/95 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-2xl backdrop-blur-md flex items-center gap-1.5 border border-slate-700">
            {isActive ? (
              <span className="text-emerald-300 font-bold">Turu Bitir (Sıra Sende!)</span>
            ) : (
              <span className="text-slate-300 italic">
                {activePlayerName ? `${activePlayerName} oynuyor...` : 'Sıra bekleniyor...'}
              </span>
            )}
          </div>
          <div className="w-2 h-2 bg-slate-950 border-r border-b border-slate-700 transform rotate-45 mx-auto -mt-1" />
        </div>
      </div>
      </div>
    </aside>
  );
};

export default TableActionButtons;
