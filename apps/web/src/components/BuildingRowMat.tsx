import React, { useState } from 'react';
import type { BuildingCard, MetropolisCard, PlayerView } from '@catankard/engine';
import {
  getBonusImageUrl,
  getBuildingImageUrl,
  getMetropolisImageUrl,
} from '../lib/cardImages.ts';
import { canAffordCard } from '../lib/canAfford.ts';
import { DeckBrowserModal, type DeckType } from './DeckBrowserModal.tsx';
import { TableCard } from './TableCard.tsx';

export interface BuildingRowMatProps {
  view: PlayerView;
  onInspectCard: (type: any, subKind?: any) => void;
  onSelectBuild: (card: BuildingCard | MetropolisCard, source: 'row' | 'metropolis') => void;
  canBuildMetropolis?: boolean;
  scale?: number;
}

export const BuildingRowMat: React.FC<BuildingRowMatProps> = ({
  view,
  onInspectCard,
  onSelectBuild,
  scale = 1,
}) => {
  const [browsingDeck, setBrowsingDeck] = useState<DeckType | null>(null);

  const isActive = view.activePlayerId === view.you && view.phase === 'action';
  const roads = view.players[view.you]?.area?.roads ?? 0;
  const subUsed = view.turnFlags?.roadSubstitutionUsed ?? false;

  const userStacks = view.players[view.you]?.area?.stacks ?? [];
  const hasOpenSettlement = userStacks.some((s) => s.top === 'settlement');
  const hasOpenCity = userStacks.some((s) => s.top === 'city');

  const topMetro = view.metropolisStack.length > 0 ? view.metropolisStack[0] : null;
  const canAffordMetro =
    hasOpenCity && canAffordCard('metropolis', view.yourHand, roads, subUsed);
  const canBuildMetro = isActive && topMetro !== null && canAffordMetro;

  // Taban kart boyutları: 96x140 px (~1.3x ölçek)
  const cardW = Math.round(96 * scale);
  const cardH = Math.round(140 * scale);

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-6 select-none relative my-2">
      {/* 1. SOL KENAR: Kapalı Kaynak Kartı Destesi */}
      <div
        className="flex flex-col items-center gap-1 group cursor-pointer"
        onClick={() => setBrowsingDeck('resource')}
        onContextMenu={(e) => {
          e.preventDefault();
          setBrowsingDeck('resource');
        }}
      >
        <div
          style={{ width: `${cardW}px`, height: `${cardH}px` }}
          className="relative rounded-xl overflow-hidden border border-amber-800/80 shadow-2xl transition-transform hover:-translate-y-1 hover:shadow-amber-900/60 bg-amber-950"
        >
          {/* Çoklu deste katman efekti */}
          <div className="absolute inset-0 bg-amber-900/40 rounded-xl translate-x-1 translate-y-1 -z-10" />
          <img
            src="/assets/cards/resource/resource_back.png"
            alt="Kaynak Destesi"
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* Deste kart sayısı rozeti */}
          <div className="absolute bottom-1.5 right-1.5 bg-black/85 text-amber-300 text-xs font-black px-2 py-0.5 rounded shadow border border-amber-600/40 pointer-events-none">
            {view.resourceDeckCount}
          </div>
        </div>
      </div>

      {/* 2. ORTA: YATAY "BUILDING ROW" ALANI */}
      <div className="relative border-2 border-white/60 rounded-2xl px-3.5 py-2.5 bg-black/35 backdrop-blur-xs shadow-2xl flex flex-col items-center">
        <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
          {/* A. 1 ADET KAPALI İNŞAAT KARTI DESTESİ */}
          <div
            className="relative rounded-xl overflow-hidden border border-emerald-600/70 shadow-lg cursor-pointer group transition-transform hover:-translate-y-0.5 bg-emerald-950"
            style={{ width: `${cardW}px`, height: `${cardH}px` }}
            onClick={() => setBrowsingDeck('building')}
            onContextMenu={(e) => {
              e.preventDefault();
              setBrowsingDeck('building');
            }}
          >
            {/* Katman efekti */}
            <div className="absolute inset-0 bg-emerald-950/60 rounded-xl translate-x-0.5 translate-y-0.5 -z-10" />
            <img
              src="/assets/cards/building/building_back.png"
              alt="İnşaat Kartı Destesi"
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Deste kart sayısı rozeti */}
            <div className="absolute bottom-1.5 right-1.5 bg-black/85 text-emerald-300 text-xs font-black px-2 py-0.5 rounded shadow border border-emerald-500/40 pointer-events-none">
              {view.buildingDeckCount}
            </div>
          </div>

          {/* B. 5 ADET AÇIK İNŞAAT KARTI YUVASI (Köy, Yol, Şehir, Şövalye) */}
          {Array.from({ length: 5 }).map((_, index) => {
            const card = view.buildingRow[index];

            if (!card) {
              return (
                <div
                  key={`empty-${index}`}
                  className="rounded-xl border-2 border-dashed border-stone-600/50 bg-stone-900/20 flex flex-col items-center justify-center text-stone-500"
                  style={{ width: `${cardW}px`, height: `${cardH}px` }}
                >
                  <span className="text-xs font-bold">#{index + 1}</span>
                </div>
              );
            }

            let canAfford = isActive && canAffordCard(card.type, view.yourHand, roads, subUsed);
            if (card.type === 'city' && !hasOpenSettlement) {
              canAfford = false;
            }

            return (
              <div
                key={card.id || index}
                className={`relative rounded-xl overflow-hidden border transition-all duration-200 select-none ${
                  canAfford
                    ? 'border-sky-400 ring-2 ring-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.85)] hover:shadow-[0_0_24px_rgba(56,189,248,1)] hover:scale-105 cursor-pointer'
                    : 'border-white/20 opacity-90 hover:opacity-100 hover:border-white/50 hover:scale-[1.02] cursor-default'
                }`}
                style={{ width: `${cardW}px`, height: `${cardH}px` }}
                onClick={() => {
                  if (canAfford) {
                    onSelectBuild(card, 'row');
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onInspectCard(card.type);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onInspectCard(card.type);
                }}
              >
                <img
                  src={getBuildingImageUrl(card.type)}
                  alt={card.type}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SAĞ KENAR: Büyükşehir Destesi & Kapalı Olay Kartı Destesi */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* BÜYÜKŞEHİR DESTESİ YUVASI */}
        <div className="flex flex-col items-center gap-1">
          <div
            className={`relative rounded-xl overflow-hidden border transition-all duration-200 select-none ${
              canBuildMetro
                ? 'border-sky-400 ring-2 ring-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.85)] hover:shadow-[0_0_24px_rgba(56,189,248,1)] hover:scale-105 cursor-pointer'
                : 'border-amber-900/40 opacity-90 hover:opacity-100 hover:border-amber-700/60 hover:scale-[1.02] cursor-default'
            }`}
            style={{ width: `${cardW}px`, height: `${cardH}px` }}
            onClick={() => {
              if (canBuildMetro && topMetro) {
                onSelectBuild(topMetro, 'metropolis');
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setBrowsingDeck('metropolis');
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setBrowsingDeck('metropolis');
            }}
          >
            {topMetro ? (
              <img
                src={getMetropolisImageUrl(topMetro)}
                alt="Büyükşehir"
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-slate-900/90 flex items-center justify-center text-xs text-slate-400 font-bold">
                Tükendi
              </div>
            )}

            {/* Deste Adedi Rozeti */}
            <div className="absolute top-1.5 right-1.5 bg-yellow-500 text-slate-950 text-xs font-black px-2 py-0.5 rounded shadow pointer-events-none">
              x{view.metropolisStack.length}
            </div>
          </div>
        </div>

        {/* KAPALI OLAY KARTI DESTESİ */}
        <div
          className="flex flex-col items-center gap-1 group cursor-pointer"
          onClick={() => setBrowsingDeck('event')}
          onContextMenu={(e) => {
            e.preventDefault();
            setBrowsingDeck('event');
          }}
        >
          <div
            style={{ width: `${cardW}px`, height: `${cardH}px` }}
            className="relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl transition-transform hover:-translate-y-1 hover:shadow-slate-800 bg-slate-950"
          >
            <div className="absolute inset-0 bg-slate-800/40 rounded-xl translate-x-1 translate-y-1 -z-10" />
            <img
              src="/assets/cards/event/event_back.png"
              alt="Olay Destesi"
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Deste kart sayısı rozeti */}
            <div className="absolute bottom-1.5 right-1.5 bg-black/85 text-slate-200 text-xs font-black px-2 py-0.5 rounded shadow border border-slate-500/40 pointer-events-none">
              {view.eventDeckCount}
            </div>
          </div>
        </div>
      </div>

      {/* 4. SAĞ KENAR: KAZANILMAYI BEKLEYEN MASADAKİ BONUS KARTLAR (3 Yol & Büyük Ordu) */}
      {(!view.longestRouteOwner || !view.largestArmyOwner) && (
        <div className="flex items-center gap-2.5 sm:gap-3 ml-1 sm:ml-2">
          {/* Henüz hiç kimse kazanmadıysa Masada market hizasında duran "En Uzun Yol" Kartı */}
          {!view.longestRouteOwner && (
            <TableCard
              id="table-bonus-longest-route"
              type="longest_route"
              scale={scale}
              baseWidth={96}
              baseHeight={140}
              onInspect={() => onInspectCard('longest_route')}
            />
          )}

          {/* Henüz hiç kimse kazanmadıysa Masada market hizasında duran "En Güçlü Ordu" Kartı */}
          {!view.largestArmyOwner && (
            <TableCard
              id="table-bonus-largest-army"
              type="largest_army"
              scale={scale}
              baseWidth={96}
              baseHeight={140}
              onInspect={() => onInspectCard('largest_army')}
            />
          )}
        </div>
      )}

      {/* Deste Gezinme Karusel Modalı */}
      <DeckBrowserModal
        deckType={browsingDeck}
        onClose={() => setBrowsingDeck(null)}
      />
    </div>
  );
};

export default BuildingRowMat;
