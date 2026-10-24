import React, { useState } from 'react';
import type { PlayerView } from '@catankard/engine';
import { BuildingRowMat } from './BuildingRowMat.tsx';
import { ImageIcon } from 'lucide-react';

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
  const [usePhotoBg, setUsePhotoBg] = useState(false);

  // Referans görsel yolları
  const bgImage =
    playerCount === 3
      ? '/assets/table/catan 3 player game main desk.png'
      : '/assets/table/catan 4 player game main desk.png';

  return (
    <div
      className={`relative w-full min-h-screen overflow-x-hidden bg-[#150103] flex items-center justify-center p-1 md:p-3 select-none ${className}`}
    >
      {/* ============================================================== */}
      {/* KIRMIZI KADİFE / KEÇE OYUN MASASI ZEMİNİ (#700913 BORDO GRADYAN) */}
      {/* ============================================================== */}
      <div
        className="relative w-full h-[96vh] min-h-[720px] max-w-[1600px] aspect-auto lg:aspect-[16/9] rounded-3xl border-4 border-[#4a0d13] shadow-[0_20px_70px_rgba(0,0,0,0.95),inset_0_0_150px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col justify-between transition-all"
        style={{
          backgroundColor: '#700913',
          backgroundImage: usePhotoBg
            ? `url("${bgImage}")`
            : 'radial-gradient(ellipse at 50% 50%, #8c0d19 0%, #700913 45%, #46060c 80%, #1e0204 100%)',
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

        {/* Masa Dokusu / Orijinal Fotoğraf Geçiş Butonu */}
        <div className="absolute top-3.5 right-4 z-30">
          <button
            type="button"
            onClick={() => setUsePhotoBg(!usePhotoBg)}
            title={usePhotoBg ? 'Kırmızı Kadife Keçe Dokusuna Geç' : 'Orijinal Referans Masa Fotoğrafına Geç'}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] sm:text-xs rounded-full bg-black/60 hover:bg-black/85 text-amber-200 border border-amber-600/40 backdrop-blur-md transition shadow-lg"
          >
            <ImageIcon size={12} />
            <span className="hidden sm:inline">{usePhotoBg ? 'Kadife Dokusu' : 'Masa Fotoğrafı'}</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* İÇERİK KATMANI: Children varsa render et, yoksa BuildingRowMat  */}
        {/* ============================================================== */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-2.5 sm:p-4 md:p-5">
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
    </div>
  );
};

export default GameMat;
