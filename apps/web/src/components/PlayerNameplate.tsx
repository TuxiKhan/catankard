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
          compact ? 'gap-1 px-1.5 py-0.5 rounded-md' : 'gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg'
        } transition-all duration-300 ${
          isTurn
            ? 'bg-gradient-to-r from-sky-950/95 via-sky-900/90 to-sky-950/95 border border-sky-400 sm:border-2 animate-blue-aura shadow-[0_0_12px_rgba(56,189,248,0.6)]'
            : 'bg-black/65 backdrop-blur-md border border-white/10 shadow-lg hover:border-white/20'
        }`}
      >
        {/* Aktif Sıra Yanıp Sönen Mavi Sinyal Işığı */}
        {isTurn && (
          <span
            className={`relative flex ${compact ? 'h-1.5 w-1.5' : 'h-1.5 w-1.5 sm:h-2 sm:w-2'} flex-shrink-0`}
            title="Sıra Bu Oyuncuda"
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-80" />
            <span
              className={`relative inline-flex rounded-full ${
                compact ? 'h-1.5 w-1.5' : 'h-1.5 w-1.5 sm:h-2 sm:w-2'
              } bg-sky-300 shadow-[0_0_8px_#38bdf8]`}
            />
          </span>
        )}

        {/* Dengeli Oyuncu İsmi & Mavi Yanıp Sönme */}
        <div className="flex items-center gap-1">
          <span
            className={`font-black tracking-wide transition-all ${
              compact
                ? isTurn
                  ? 'text-[10px] text-sky-300 drop-shadow-[0_0_6px_rgba(56,189,248,0.9)]'
                  : 'text-[10px] text-slate-200'
                : isTurn
                ? 'text-[11px] sm:text-sm text-sky-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.9)] animate-blue-pulse-glow'
                : 'text-[11px] sm:text-xs text-slate-200'
            }`}
          >
            {name}
            {isMe && !name.toLowerCase().includes('sen') && (
              <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-bold text-sky-400/80 ml-0.5`}>(Sen)</span>
            )}
          </span>

          {/* Sıra Bildirim Rozeti (Kompakt değilken) */}
          {isTurn && !compact && (
            <span className="hidden md:inline-flex items-center gap-0.5 text-[8px] uppercase font-black tracking-wider text-sky-200 bg-sky-500/25 px-1 py-0.2 rounded border border-sky-400/40 shadow-[0_0_6px_rgba(56,189,248,0.25)]">
              <Sparkles size={8} className="text-sky-300" />
              {isMe ? 'SENDE' : 'SIRASI'}
            </span>
          )}
        </div>

        {/* Ayraç */}
        <div
          className={`${compact ? 'h-2.5' : 'h-3 sm:h-3.5'} w-px ${isTurn ? 'bg-sky-400/40' : 'bg-white/15'}`}
          aria-hidden="true"
        />

        {/* Zafer Puanı (ZP) Rozeti */}
        <div
          className={`flex items-center ${
            compact ? 'gap-0.5 px-1 py-0.2 rounded text-[8px]' : 'gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs'
          } bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black shadow-sm shrink-0`}
          title={`${victoryPoints} Zafer Puanı`}
        >
          <Award size={compact ? 9 : 11} className="text-slate-950 fill-current" />
          <span>{victoryPoints} ZP</span>
        </div>

        {/* Kart Sayısı Rozeti (Varsa) */}
        {cardCount !== undefined && (
          <span
            className={`${
              compact ? 'text-[8px] px-0.5 py-0.2 rounded' : 'text-[9px] sm:text-[10px] px-1 py-0.5 rounded'
            } font-bold text-slate-400 bg-black/40 border border-white/5 shrink-0`}
            title={`${cardCount} kart`}
          >
            🎴{cardCount}
          </span>
        )}

        {/* En Uzun Yol & En Büyük Ordu Başarı Rozetleri */}
        {(hasLongestRoute || hasLargestArmy) && (
          <div className="flex items-center gap-0.5 ml-0.5">
            {hasLongestRoute && (
              <span
                className={`flex items-center justify-center ${
                  compact ? 'w-3.5 h-3.5 text-[8px]' : 'w-4 h-4 text-[9px] sm:text-[10px]'
                } rounded bg-amber-500/20 border border-amber-400/50 shadow-sm`}
                title="En Uzun Yol (+2 ZP)"
              >
                🛣️
              </span>
            )}
            {hasLargestArmy && (
              <span
                className={`flex items-center justify-center ${
                  compact ? 'w-3.5 h-3.5 text-[8px]' : 'w-4 h-4 text-[9px] sm:text-[10px]'
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
