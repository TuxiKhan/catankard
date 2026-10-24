import React from 'react';
import { Award, Sparkles } from 'lucide-react';

export interface PlayerNameplateProps {
  name: string;
  isTurn: boolean;
  isMe?: boolean;
  victoryPoints: number;
  hasLongestRoute?: boolean;
  hasLargestArmy?: boolean;
  cardCount?: number;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export const PlayerNameplate: React.FC<PlayerNameplateProps> = ({
  name,
  isTurn,
  isMe = false,
  victoryPoints,
  hasLongestRoute = false,
  hasLargestArmy = false,
  cardCount,
  align = 'center',
  className = '',
}) => {
  const alignContainerClass =
    align === 'left'
      ? 'items-start text-left'
      : align === 'right'
      ? 'items-end text-right'
      : 'items-center text-center';

  return (
    <div className={`relative inline-flex flex-col ${alignContainerClass} ${className} select-none`}>
      {/* Sırası gelen oyuncu için arkada yumuşak mavi neon hare */}
      {isTurn && (
        <div
          className="absolute -inset-1 rounded-2xl bg-sky-400/25 blur-md animate-pulse pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Ana İsim Plakası */}
      <div
        className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all duration-300 ${
          isTurn
            ? 'bg-gradient-to-r from-sky-950/95 via-sky-900/90 to-sky-950/95 border-2 border-sky-400 animate-blue-aura shadow-[0_0_20px_rgba(56,189,248,0.7)]'
            : 'bg-black/65 backdrop-blur-md border border-white/10 shadow-lg hover:border-white/20'
        }`}
      >
        {/* Aktif Sıra Yanıp Sönen Mavi Sinyal Işığı */}
        {isTurn && (
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0" title="Sıra Bu Oyuncuda">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-80" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-300 shadow-[0_0_8px_#38bdf8]" />
          </span>
        )}

        {/* Büyütülmüş Oyuncu İsmi & Mavi Yanıp Sönme */}
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black tracking-wide transition-all ${
              isTurn
                ? 'text-base sm:text-lg text-sky-300 drop-shadow-[0_0_12px_rgba(56,189,248,0.95)] animate-blue-pulse-glow'
                : 'text-sm sm:text-base text-slate-200'
            }`}
          >
            {name}
            {isMe && <span className="text-[11px] font-bold text-sky-400/80 ml-1">(Sen)</span>}
          </span>

          {/* Sıra Bildirim Rozeti */}
          {isTurn && (
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] uppercase font-black tracking-widest text-sky-200 bg-sky-500/25 px-1.5 py-0.5 rounded-md border border-sky-400/40 shadow-[0_0_8px_rgba(56,189,248,0.3)]">
              <Sparkles size={9} className="text-sky-300" />
              {isMe ? 'SENDE' : 'SIRASI'}
            </span>
          )}
        </div>

        {/* Ayraç */}
        <div
          className={`h-4 w-px ${isTurn ? 'bg-sky-400/40' : 'bg-white/15'}`}
          aria-hidden="true"
        />

        {/* Zafer Puanı (ZP) Rozeti */}
        <div
          className="flex items-center gap-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black px-2 py-0.5 rounded-lg shadow-sm text-xs sm:text-sm"
          title={`${victoryPoints} Zafer Puanı`}
        >
          <Award size={13} className="text-slate-950 fill-current" />
          <span>{victoryPoints} ZP</span>
        </div>

        {/* Kart Sayısı Rozeti (Varsa) */}
        {cardCount !== undefined && (
          <span
            className="text-[11px] font-bold text-slate-400 bg-black/40 px-1.5 py-0.5 rounded-md border border-white/5"
            title={`${cardCount} kart`}
          >
            🎴 {cardCount}
          </span>
        )}

        {/* En Uzun Yol & En Büyük Ordu Başarı Rozetleri */}
        {(hasLongestRoute || hasLargestArmy) && (
          <div className="flex items-center gap-1 ml-0.5">
            {hasLongestRoute && (
              <span
                className="flex items-center justify-center w-5 h-5 rounded-md bg-amber-500/20 border border-amber-400/50 text-xs shadow-sm"
                title="En Uzun Yol (+2 ZP)"
              >
                🛣️
              </span>
            )}
            {hasLargestArmy && (
              <span
                className="flex items-center justify-center w-5 h-5 rounded-md bg-red-500/20 border border-red-400/50 text-xs shadow-sm"
                title="En Güçlü Ordu (+2 ZP)"
              >
                ⚔️
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerNameplate;
