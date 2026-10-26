import React from 'react';

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
  victoryPoints,
  align = 'center',
  className = '',
  compact = false,
}) => {
  const cleanName =
    name
      .replace(/^Sen\s*\((.+)\)$/i, '$1')
      .replace(/\s*\(Sen\)$/i, '')
      .replace(/^Sen$/i, 'Oyuncu')
      .replace(/\s+SENDE$/i, '')
      .trim() || name;

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

      {/* Ana İsim Plakası: Sadece İsim ve Zafer Puanı */}
      <div
        className={`relative flex items-center ${
          compact ? 'gap-1 px-1.5 py-0.5 rounded-md' : 'gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg'
        } transition-all duration-300 ${
          isTurn
            ? 'bg-gradient-to-r from-sky-950/95 via-sky-900/90 to-sky-950/95 border border-sky-400 sm:border-2 animate-blue-aura shadow-[0_0_12px_rgba(56,189,248,0.6)]'
            : 'bg-black/65 backdrop-blur-md border border-white/10 shadow-lg hover:border-white/20'
        }`}
      >
        {/* Oyuncu İsmi */}
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
          {cleanName}
        </span>

        {/* Ayraç */}
        <div
          className={`${compact ? 'h-2.5' : 'h-3 sm:h-3.5'} w-px ${isTurn ? 'bg-sky-400/40' : 'bg-white/15'}`}
          aria-hidden="true"
        />

        {/* Zafer Puanı (ZP) */}
        <div
          className={`flex items-center ${
            compact ? 'px-1 py-0.2 rounded text-[8px]' : 'px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs'
          } bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black shadow-sm shrink-0`}
          title={`${victoryPoints} Zafer Puanı`}
        >
          <span>{victoryPoints} ZP</span>
        </div>
      </div>
    </div>
  );
};

export default PlayerNameplate;
