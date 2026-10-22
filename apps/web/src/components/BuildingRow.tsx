import React from 'react';
import type { BuildingCard, MetropolisCard, PlayerView } from '@catankard/engine';
import {
  getBonusImageUrl,
  getBuildingImageUrl,
  getMetropolisImageUrl,
} from '../lib/cardImages.ts';

interface BuildingRowProps {
  view: PlayerView;
  onInspectCard: (type: any, subKind?: any) => void;
  onBuildFromRow: (card: BuildingCard) => void;
  onBuildMetropolis: (metro: MetropolisCard) => void;
  canBuildCardId: (cardId: string) => boolean;
  canBuildMetropolis: boolean;
}

export const BuildingRow: React.FC<BuildingRowProps> = ({
  view,
  onInspectCard,
  onBuildFromRow,
  onBuildMetropolis,
  canBuildCardId,
  canBuildMetropolis,
}) => {
  const isActive = view.activePlayerId === view.you && view.phase === 'action';

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            İnşa Sırası (Building Row)
          </span>
          <span className="text-xs text-slate-400">
            Deste: <strong className="text-slate-200">{view.buildingDeckCount}</strong>
          </span>
        </div>

        {/* Bonus Kartları Bilgisi */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onInspectCard('longest_route')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition ${
              view.longestRouteOwner
                ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
          >
            <img src={getBonusImageUrl('longest_route')} alt="En Uzun Yol" className="w-5 h-7 object-contain" />
            <span>En Uzun Yol (2 ZP)</span>
            {view.longestRouteOwner && (
              <span className="font-bold text-white ml-1">
                ({view.players[view.longestRouteOwner]?.name})
              </span>
            )}
          </div>

          <div
            onClick={() => onInspectCard('largest_army')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition ${
              view.largestArmyOwner
                ? 'border-red-500 bg-red-950/40 text-red-300'
                : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
          >
            <img src={getBonusImageUrl('largest_army')} alt="En Güçlü Ordu" className="w-5 h-7 object-contain" />
            <span>En Güçlü Ordu (2 ZP)</span>
            {view.largestArmyOwner && (
              <span className="font-bold text-white ml-1">
                ({view.players[view.largestArmyOwner]?.name})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Kart Sırası */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {/* 5 Building Row Kartı */}
        {view.buildingRow.map((card) => {
          const canBuild = isActive && canBuildCardId(card.id);
          return (
            <div
              key={card.id}
              className={`relative rounded-xl border-2 p-2 flex flex-col items-center justify-between transition-all group ${
                canBuild
                  ? 'border-amber-500 bg-slate-800/90 shadow-amber-500/20 shadow-lg hover:scale-105'
                  : 'border-slate-700 bg-slate-800/50 opacity-90'
              }`}
            >
              <div
                onClick={() => onInspectCard(card.type)}
                className="w-full h-36 flex items-center justify-center cursor-pointer mb-2"
              >
                <img
                  src={getBuildingImageUrl(card.type)}
                  alt={card.type}
                  className="w-full h-full object-contain filter drop-shadow"
                />
              </div>

              {canBuild ? (
                <button
                  type="button"
                  onClick={() => onBuildFromRow(card)}
                  className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition shadow"
                >
                  İnşa Et
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onInspectCard(card.type)}
                  className="w-full py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  İncele
                </button>
              )}
            </div>
          );
        })}

        {/* Büyükşehir Yığını (Metropolis Stack) */}
        {view.metropolisStack.length > 0 ? (
          (() => {
            const topMetro = view.metropolisStack[0]!;
            const canBuild = isActive && canBuildMetropolis;

            return (
              <div
                className={`relative rounded-xl border-2 p-2 flex flex-col items-center justify-between transition-all ${
                  canBuild
                    ? 'border-purple-500 bg-slate-800/90 shadow-purple-500/20 shadow-lg hover:scale-105'
                    : 'border-purple-900/60 bg-slate-800/40'
                }`}
              >
                <div className="absolute top-1 right-2 bg-purple-900/90 text-purple-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-purple-500">
                  {view.metropolisStack.length} kaldı
                </div>

                <div
                  onClick={() => onInspectCard('metropolis', topMetro.kind)}
                  className="w-full h-36 flex items-center justify-center cursor-pointer mb-2"
                >
                  <img
                    src={getMetropolisImageUrl(topMetro)}
                    alt="Büyükşehir"
                    className="w-full h-full object-contain filter drop-shadow"
                  />
                </div>

                {canBuild ? (
                  <button
                    type="button"
                    onClick={() => onBuildMetropolis(topMetro)}
                    className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition shadow"
                  >
                    Büyükşehir Kur
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onInspectCard('metropolis', topMetro.kind)}
                    className="w-full py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    İncele ({topMetro.side})
                  </button>
                )}
              </div>
            );
          })()
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 flex items-center justify-center p-3 text-slate-500 text-xs text-center">
            Büyükşehirler Tükendi
          </div>
        )}
      </div>
    </div>
  );
};
