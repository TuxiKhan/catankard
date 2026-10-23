import React from 'react';
import type { PlayerArea, PlayerId, PlayerView, Resource } from '@catankard/engine';
import { CardStack } from './CardStack.tsx';
import { FannedHand } from './FannedHand.tsx';

interface PlayerDeskProps {
  playerId: PlayerId;
  view: PlayerView;
  isCurrentPlayer: boolean;
  onInspectCard: (type: any, subKind?: any) => void;
  onSelectStack?: (stackId: string) => void;
  selectedStackId?: string | null;
  targetUpgradeType?: 'city' | 'metropolis' | null;
}

export const PlayerDesk: React.FC<PlayerDeskProps> = ({
  playerId,
  view,
  isCurrentPlayer: _isCurrentPlayer,
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
  const roadRatio =
    area.roads <= 1 ? '4:1' : area.roads === 2 ? '3:1' : area.roads === 3 ? '2:1' : '1:1';

  return (
    <div
      className={`relative rounded-2xl border-2 p-3 transition-all backdrop-blur-md shadow-xl flex flex-col justify-between ${
        isTurn
          ? 'border-amber-400 bg-slate-800/95 ring-2 ring-amber-400/30'
          : 'border-slate-700 bg-slate-900/80'
      } ${p.removed ? 'opacity-40 grayscale' : ''}`}
    >
      {/* Üst Kısım: Başlık ve Zafer Puanı */}
      <div>
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

          <div className="flex items-center gap-1.5 bg-amber-950/80 border border-amber-600/70 px-2.5 py-0.5 rounded-full shadow-inner">
            <span className="text-xs font-black text-yellow-400">{p.visibleVP}</span>
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

        {/* Yerleşim Yığınları (Köy -> Şehir -> Büyükşehir dikey katmanlı basamaklar) */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Yerleşimler & Şehirler ({area.stacks.length})
            </span>
            {targetUpgradeType && isYou && (
              <span className="text-[10px] text-emerald-400 font-extrabold animate-pulse">
                Hedef Seçin
              </span>
            )}
          </div>

          {area.stacks.length === 0 ? (
            <div className="text-xs text-slate-500 italic p-2 border border-dashed border-slate-800 rounded-lg text-center">
              Henüz köy kurulmadı
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5 items-end min-h-[110px]">
              {area.stacks.map((stack) => {
                const isSettlement = stack.top === 'settlement';
                const isCity = stack.top === 'city';

                const canSelectForCity = targetUpgradeType === 'city' && isSettlement && isYou;
                const canSelectForMetro = targetUpgradeType === 'metropolis' && isCity && isYou;
                const isSelectable = canSelectForCity || canSelectForMetro;
                const isSelected = selectedStackId === stack.id;

                return (
                  <CardStack
                    key={stack.id}
                    stack={stack}
                    isSelectable={isSelectable}
                    isSelected={isSelected}
                    onInspect={onInspectCard}
                    onSelectUpgrade={onSelectStack}
                    size="sm"
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alt Kısım: Kart Yelpazesi (Fanned Hand) */}
      <div className="mt-2 pt-2 border-t border-slate-700/60 flex flex-col items-center">
        {isYou ? (
          /* AKTİF OYUNCUNUN AÇIK EL YELPAZESİ */
          <div className="w-full flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                Elinizdeki Kaynaklar ({p.handCount})
              </span>
              <span className="text-[9px] text-slate-400">İncelemek için karta tıkla</span>
            </div>
            <div className="w-full overflow-visible py-2 flex justify-center">
              <FannedHand
                resources={view.yourHand}
                onCardClick={(r: Resource) => onInspectCard(r)}
                compact={false}
              />
            </div>
          </div>
        ) : (
          /* RAKİBİN KAPALI EL YELPAZESİ */
          <div className="w-full flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Rakip Eli ({p.handCount})
              </span>
            </div>
            <div className="w-full overflow-visible py-1 flex justify-center">
              <FannedHand
                isOpponent={true}
                count={p.handCount}
                compact={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
