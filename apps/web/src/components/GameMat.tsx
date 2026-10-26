import React, { useState, useEffect, useRef } from 'react';
import type { PlayerView } from '@catankard/engine';
import { BuildingRowMat } from './BuildingRowMat.tsx';
import { Palette, Check, Volume2, VolumeX } from 'lucide-react';
import { useBackgroundMusic } from '../lib/useBackgroundMusic.ts';

export type TableThemeId = 'bordo' | 'emerald' | 'midnight' | 'anthracite';

export interface TableTheme {
  id: TableThemeId;
  name: string;
  bg: string;
  radial: string;
  border: string;
  outerBg: string;
  swatch: string;
}

export const TABLE_THEMES: Record<TableThemeId, TableTheme> = {
  bordo: {
    id: 'bordo',
    name: 'Bordo Klasik',
    bg: '#700913',
    radial: 'radial-gradient(ellipse at 50% 50%, #8c0d19 0%, #700913 45%, #46060c 80%, #1e0204 100%)',
    border: '#4a0d13',
    outerBg: '#150103',
    swatch: '#8c0d19',
  },
  emerald: {
    id: 'emerald',
    name: 'Zümrüt Yeşili',
    bg: '#0d522c',
    radial: 'radial-gradient(ellipse at 50% 50%, #166534 0%, #0d522c 45%, #052e16 80%, #021a0d 100%)',
    border: '#064e3b',
    outerBg: '#02180e',
    swatch: '#166534',
  },
  midnight: {
    id: 'midnight',
    name: 'Gece Mavisi',
    bg: '#0f2b48',
    radial: 'radial-gradient(ellipse at 50% 50%, #1e3a8a 0%, #0f2b48 45%, #081d33 80%, #030c17 100%)',
    border: '#1e3a8a',
    outerBg: '#040d18',
    swatch: '#1e3a8a',
  },
  anthracite: {
    id: 'anthracite',
    name: 'Kömür / Antrasit',
    bg: '#1e242b',
    radial: 'radial-gradient(ellipse at 50% 50%, #334155 0%, #1e242b 45%, #0f172a 80%, #020617 100%)',
    border: '#334155',
    outerBg: '#0b0f14',
    swatch: '#334155',
  },
};

const THEME_LIST: TableTheme[] = [
  TABLE_THEMES.bordo,
  TABLE_THEMES.emerald,
  TABLE_THEMES.midnight,
  TABLE_THEMES.anthracite,
];

const STORAGE_KEY = 'catankard_table_theme';

export interface GameMatProps {
  playerCount: 3 | 4;
  children?: React.ReactNode;
  view?: PlayerView;
  onInspectCard?: (type: any, subKind?: any) => void;
  onSelectBuild?: (card: any, source: 'row' | 'metropolis') => void;
  canBuildMetropolis?: boolean;
  className?: string;
}

export const GameMat: React.FC<GameMatProps> = ({
  playerCount,
  children,
  view,
  onInspectCard,
  onSelectBuild,
  canBuildMetropolis,
  className = '',
}) => {
  const [themeId, setThemeId] = useState<TableThemeId>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && saved in TABLE_THEMES) {
          return saved as TableThemeId;
        }
      }
    } catch {
      // localStorage erişim hatası olursa varsayılana dön
    }
    return 'bordo';
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const volumeTrackRef = useRef<HTMLDivElement>(null);
  const { isMuted, volume, setVolume, toggleMute } = useBackgroundMusic();

  useEffect(() => {
    if (!isMenuOpen && !isVolumeOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setIsVolumeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen, isVolumeOpen]);

  const updateVolumeFromPointer = (clientY: number) => {
    const track = volumeTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.height <= 0) return;
    const ratio = 1 - (clientY - rect.top) / rect.height;
    setVolume(Math.max(0, Math.min(1, ratio)));
  };

  const handleSelectTheme = (id: TableThemeId) => {
    setThemeId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // localStorage hatası durumunda sessiz kal
    }
  };

  const currentTheme = TABLE_THEMES[themeId] || TABLE_THEMES.bordo;

  // Body arka plan rengini seçili çuha temasıyla senkronize et
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = currentTheme.outerBg || currentTheme.bg;
    }
  }, [currentTheme]);

  return (
    <div
      className={`relative w-full w-screen h-screen min-h-screen overflow-hidden flex flex-col justify-between select-none transition-colors duration-500 ${className}`}
      style={{
        backgroundColor: currentTheme.bg,
        backgroundImage: currentTheme.radial,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Kadife Kumaş Doku Efekti (Subtle velvet / felt noise weave overlay) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage: `radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)`,
          backgroundSize: '14px 14px',
        }}
      />

      {/* Masa Kenar Vinyet Efekti (Edge-to-edge luxury felt table vignette) */}
      <div
        className="absolute inset-0 pointer-events-none shadow-[inset_0_0_160px_rgba(0,0,0,0.85),inset_0_0_60px_rgba(0,0,0,0.5)] z-0"
      />

      {/* Masa Rengi Teması Seçici & Ses Açma/Kapama Tuşu */}
      <div
        className="fixed top-1.5 right-2 sm:top-14 sm:right-4 z-[60] flex items-center gap-1.5 pointer-events-auto"
        ref={menuRef}
      >
        <div className="relative flex flex-col items-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(false);
              setIsVolumeOpen((prev) => !prev);
            }}
            title="Ses Seviyesi ve Sessize Alma"
            aria-label="Ses Seviyesi ve Sessize Alma"
            className={`flex items-center justify-center p-1.5 sm:p-2 rounded-full bg-black/75 hover:bg-black/95 border backdrop-blur-md transition shadow-lg cursor-pointer ${
              isMuted
                ? 'text-red-400 border-red-500/50 hover:text-red-300'
                : 'text-amber-300 border-amber-500/50 hover:text-amber-100'
            }`}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Dikey Ses Seviyesi Çubuğu */}
          {isVolumeOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-full mt-1.5 py-2.5 px-2 rounded-2xl bg-black/90 border border-amber-600/40 backdrop-blur-md shadow-2xl flex flex-col items-center gap-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <span className="text-[9px] font-black text-amber-300 font-mono leading-none select-none">
                {Math.round(volume * 100)}%
              </span>

              <div
                ref={volumeTrackRef}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  updateVolumeFromPointer(e.clientY);
                }}
                onPointerMove={(e) => {
                  if (e.buttons > 0 || e.pressure > 0) {
                    updateVolumeFromPointer(e.clientY);
                  }
                }}
                className="relative w-2.5 h-24 sm:h-28 rounded-full bg-zinc-800/95 border border-white/15 cursor-pointer touch-none flex items-end overflow-visible shadow-inner"
              >
                <div
                  className="w-full rounded-full bg-gradient-to-t from-amber-600 via-amber-400 to-amber-300 transition-[height] duration-75"
                  style={{ height: `${Math.round(volume * 100)}%` }}
                />
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-amber-300 border-2 border-black shadow-[0_0_8px_rgba(251,191,36,0.9)] pointer-events-none"
                  style={{ bottom: `calc(${Math.round(volume * 100)}% - 8px)` }}
                />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                title={isMuted ? 'Sesi Aç' : 'Sessize Al'}
                className={`p-1 rounded-full transition cursor-pointer ${
                  isMuted
                    ? 'text-red-400 bg-red-500/20 hover:bg-red-500/30'
                    : 'text-amber-300/80 hover:text-amber-200 hover:bg-white/10'
                }`}
              >
                {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsVolumeOpen(false);
              setIsMenuOpen((prev) => !prev);
            }}
            title="Masa Çuhası Rengini Değiştir"
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] sm:text-xs rounded-full bg-black/60 hover:bg-black/85 text-amber-200 border border-amber-600/40 backdrop-blur-md transition shadow-lg group cursor-pointer"
          >
            <Palette size={13} className="text-amber-300 transition-transform group-hover:rotate-12" />
            <span className="hidden sm:inline font-medium">{currentTheme.name}</span>
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/50 shadow-inner"
              style={{ backgroundColor: currentTheme.swatch }}
            />
          </button>

          {/* Tema Açılır Menüsü */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 p-1.5 rounded-xl bg-black/90 border border-amber-600/40 backdrop-blur-md shadow-2xl flex flex-col gap-1 min-w-[155px] z-50">
              <div className="px-2 py-1 text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider border-b border-amber-600/20 mb-0.5">
                Masa Çuhası Rengi
              </div>
              {THEME_LIST.map((theme) => {
                const isSelected = theme.id === themeId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      handleSelectTheme(theme.id);
                      setIsMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                        : 'text-zinc-300 hover:bg-white/10 hover:text-white border border-transparent'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full border shadow-sm shrink-0 ${
                        isSelected ? 'border-amber-300 scale-110' : 'border-white/40'
                      }`}
                      style={{ backgroundColor: theme.swatch }}
                    />
                    <span className="truncate">{theme.name}</span>
                    {isSelected && <Check size={13} className="ml-auto text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* İÇERİK KATMANI: Children varsa render et, yoksa BuildingRowMat  */}
      {/* ============================================================== */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-2 sm:p-3 md:p-4">
        {children ? (
          children
        ) : view ? (
          <div className="my-auto flex items-center justify-center">
            <BuildingRowMat
              view={view}
              onInspectCard={onInspectCard || (() => {})}
              onSelectBuild={onSelectBuild || (() => {})}
              canBuildMetropolis={Boolean(canBuildMetropolis)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GameMat;
