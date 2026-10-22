import React from 'react';
import type { PlayerArea, PlayerId, PlayerView, Resource } from '@catankard/engine';
import {
  getBuildingImageUrl,
  getMetropolisImageUrl,
  getResourceImageUrl,
} from '../lib/cardImages.ts';

interface PlayerDeskProps {
  playerId: PlayerId;
  view: PlayerView;
  isCurrentPlayer: boolean;
  onInspectCard: (type: any, subKind?: any) => void;
  onSelectStack?: (stackId: string) => void;
  selectedStackId?: string | null;
  targetUpgradeType?: 'city' | 'metropolis' | null;
}

const RES_ORDER: Resource[] = ['brick', 'wood', 'wool', 'wheat', 'ore'];

export const PlayerDesk: React.FC<PlayerDeskProps> = ({
  playerId,
  view,
  isCurrentPlayer,
  onInspectCard,
  onSelectStack,
  selectedStackId,
  targetUpgradeType,
}) => {
  const p = view.players[playerId];
  if (!p) return null;

  const area: PlayerArea = p.area;
  const isTurn = view.activePlayerId === playerId;
  const isYou = view.you === playerId;

  // Yol takas oranı hesapla
  const roadRatio = area.roads <= 1 ? '4:1' : area.roads === 2 ? '3:1' : area.roads === 3 ? '2:1' : '1:1';

  return (
    <div
      className={`relative rounded-2xl border-2 p-3 transition-all backdrop-blur-md shadow-xl ${
        isTurn
          ? 'border-amber-400 bg-slate-800/95 ring-2 ring-amber-400/30'
          : 'border-slate-700 bg-slate-900/80'
      } ${p.removed ? 'opacity-40 grayscale' : ''}`}
    >
      {/* Başlık ve Zafer Puanı */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isTurn ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="font-bold text-sm text-slate-100 truncate max-w-[120px]">
            {p.name} {isYou && <span className="text-amber-400 text-xs">(Sen)</span>}
          </span>
          {p.removed && (
            <span className="text-[10px] bg-red-900 text-red-200 px-1.5 py-0.5 rounded">
              Ayrıldı
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-amber-950/80 border border-amber-600/70 px-2 py-0.5 rounded-full">
          <span className="text-xs font-bold text-yellow-400">{p.visibleVP}</span>
          <span className="text-[10px] text-amber-200 font-medium">/ 7 ZP</span>
        </div>
      </div>

      {/* İstatistik Çubuğu: Yollar, Şövalyeler, El */}
      <div className="grid grid-cols-3 gap-1.5 mb-3 text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800">
        <div className="flex flex-col items-center">
          <span className="text-slate-400">Yollar ({area.roads})</span>
          <span className="font-bold text-amber-400">{roadRatio}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-slate-400">Şövalye ({area.knights})</span>
          <span className="font-bold text-blue-400">+{area.knights} limit</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-slate-400">Kaynak</span>
          <span className="font-bold text-emerald-400">{p.handCount} kart</span>
        </div>
      </div>

      {/* Yerleşim Yığınları (Settlement / City / Metropolis) */}
      <div className="mb-2">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
          Yerleşimler & Şehirler ({area.stacks.length})
        </span>
        <div className="flex flex-wrap gap-2">
          {area.stacks.map((stack) => {
            const isSettlement = stack.top === 'settlement';
            const isCity = stack.top === 'city';
            const isMetropolis = stack.top === 'metropolis';

            const canSelectForCity = targetUpgradeType === 'city' && isSettlement && isYou;
            const canSelectForMetro = targetUpgradeType === 'metropolis' && isCity && isYou;
            const isSelectable = canSelectForCity || canSelectForMetro;
            const isSelected = selectedStackId === stack.id;

            return (
              <div
                key={stack.id}
                onClick={() => {
                  if (isSelectable && onSelectStack) {
                    onSelectStack(stack.id);
                  } else {
                    if (isMetropolis && stack.metropolis) {
                      onInspectCard('metropolis', stack.metropolis.kind);
                    } else {
                      onInspectCard(stack.top);
                    }
                  }
                }}
                className={`relative rounded-xl border-2 p-1 w-16 h-24 flex flex-col items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'border-yellow-400 ring-2 ring-yellow-400 bg-yellow-950/50 scale-105'
                    : isSelectable
                    ? 'border-emerald-400 bg-emerald-950/30 animate-bounce'
                    : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'
                }`}
              >
                <div className="w-full h-16 flex items-center justify-center">
                  <img
                    src={
                      isMetropolis && stack.metropolis
                        ? getMetropolisImageUrl(stack.metropolis)
                        : getBuildingImageUrl(stack.top as any)
                    }
                    alt={stack.top}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[9px] font-bold text-slate-300 truncate w-full text-center">
                  {isSettlement ? 'Köy (1)' : isCity ? 'Şehir (2)' : 'B.Şehir (3)'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Eğer bu masa SENİN masansa, elindeki kartları göster */}
      {isYou && (
        <div className="mt-3 pt-2 border-t border-slate-700/60">
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block mb-1.5">
            Elinizdeki Kaynaklar ({p.handCount})
          </span>
          <div className="grid grid-cols-5 gap-1.5">
            {RES_ORDER.map((r) => {
              const count = view.yourHand[r] || 0;
              return (
                <div
                  key={r}
                  onClick={() => onInspectCard(r)}
                  className={`flex flex-col items-center bg-slate-950/80 border rounded-lg p-1 cursor-pointer transition ${
                    count > 0 ? 'border-amber-600/50 hover:border-amber-400' : 'border-slate-800 opacity-40'
                  }`}
                >
                  <img src={getResourceImageUrl(r)} alt={r} className="w-6 h-9 object-contain mb-0.5" />
                  <span className="text-xs font-bold text-white">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
