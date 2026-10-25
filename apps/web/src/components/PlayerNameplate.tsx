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
  /** Dikey mod veya dar alanlar için kompakt mikro boyut */
  compact?: boolean;
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
  compact = false,
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
        className={`relative flex items-center ${
          compact ? 'gap-1 px-1.5 py-0.5 rounded-md' : 'gap-1.5 sm:gap-2 px-2 py-0.5 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl'
        } transition-all duration-300 ${
          isTurn
            ? 'bg-gradient-to-r from-sky-950/95 via-sky-900/90 to-sky-950/95 border border-sky-400 sm:border-2 animate-blue-aura shadow-[0_0_15px_rgba(56,189,248,0.7)]'
            : 'bg-black/65 backdrop-blur-md border border-white/10 shadow-lg hover:border-white/20'
        }`}
      >
        {/* Aktif Sıra Yanıp Sönen Mavi Sinyal Işığı */}
        {isTurn && (
          <span
            className={`relative flex ${compact ? 'h-1.5 w-1.5' : 'h-2 w-2 sm:h-2.5 sm:w-2.5'} flex-shrink-0`}
            title="Sıra Bu Oyuncuda"
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-80" />
            <span
              className={`relative inline-flex rounded-full ${
                compact ? 'h-1.5 w-1.5' : 'h-2 w-2 sm:h-2.5 sm:w-2.5'
              } bg-sky-300 shadow-[0_0_8px_#38bdf8]`}
            />
          </span>
        )}

        {/* Büyütülmüş Oyuncu İsmi & Mavi Yanıp Sönme */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span
            className={`font-black tracking-wide transition-all ${
              compact
                ? isTurn
                  ? 'text-[10px] text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.95)]'
                  : 'text-[10px] text-slate-200'
                : isTurn
                ? 'text-xs sm:text-lg text-sky-300 drop-shadow-[0_0_12px_rgba(56,189,248,0.95)] animate-blue-pulse-glow'
                : 'text-xs sm:text-base text-slate-200'
            }`}
          >
            {name}
            {isMe && !name.toLowerCase().includes('sen') && (
              <span className={`${compact ? 'text-[9px]' : 'text-[11px]'} font-bold text-sky-400/80 ml-0.5`}>(Sen)</span>
            )}
          </span>

          {/* Sıra Bildirim Rozeti (Kompakt değilken) */}
          {isTurn && !compact && (
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] uppercase font-black tracking-widest text-sky-200 bg-sky-500/25 px-1.5 py-0.5 rounded-md border border-sky-400/40 shadow-[0_0_8px_rgba(56,189,248,0.3)]">
              <Sparkles size={9} className="text-sky-300" />
              {isMe ? 'SENDE' : 'SIRASI'}
            </span>
          )}
        </div>

        {/* Ayraç */}
        <div
          className={`${compact ? 'h-3' : 'h-4'} w-px ${isTurn ? 'bg-sky-400/40' : 'bg-white/15'}`}
          aria-hidden="true"
        />

        {/* Zafer Puanı (ZP) Rozeti */}
        <div
          className={`flex items-center ${
            compact ? 'gap-0.5 px-1 py-0.2 rounded text-[9px]' : 'gap-1 px-2 py-0.5 rounded-lg text-xs sm:text-sm'
          } bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black shadow-sm shrink-0`}
          title={`${victoryPoints} Zafer Puanı`}
        >
          <Award size={compact ? 10 : 13} className="text-slate-950 fill-current" />
          <span>{victoryPoints} ZP</span>
        </div>

        {/* Kart Sayısı Rozeti (Varsa) */}
        {cardCount !== undefined && (
          <span
            className={`${
              compact ? 'text-[9px] px-1 py-0.2 rounded' : 'text-[11px] px-1.5 py-0.5 rounded-md'
            } font-bold text-slate-400 bg-black/40 border border-white/5 shrink-0`}
            title={`${cardCount} kart`}
          >
            🎴 {cardCount}
          </span>
        )}

        {/* En Uzun Yol & En Büyük Ordu Başarı Rozetleri */}
        {(hasLongestRoute || hasLargestArmy) && (
          <div className="flex items-center gap-0.5 ml-0.5">
            {hasLongestRoute && (
              <span
                className={`flex items-center justify-center ${
                  compact ? 'w-4 h-4 text-[9px]' : 'w-5 h-5 text-xs'
                } rounded bg-amber-500/20 border border-amber-400/50 shadow-sm`}
                title="En Uzun Yol (+2 ZP)"
              >
                🛣️
              </span>
            )}
            {hasLargestArmy && (
              <span
                className={`flex items-center justify-center ${
                  compact ? 'w-4 h-4 text-[9px]' : 'w-5 h-5 text-xs'
                } rounded bg-red-500/20 border border-red-400/50 shadow-sm`}
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
