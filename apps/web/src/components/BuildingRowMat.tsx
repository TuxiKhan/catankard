import React from 'react';
import type { BuildingCard, MetropolisCard, PlayerView } from '@catankard/engine';
import {
  getBonusImageUrl,
  getBuildingImageUrl,
  getMetropolisImageUrl,
} from '../lib/cardImages.ts';
import { canAffordCard } from '../lib/canAfford.ts';

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
  const isActive = view.activePlayerId === view.you && view.phase === 'action';
  const roads = view.players[view.you]?.area?.roads ?? 0;
  const subUsed = view.turnFlags?.roadSubstitutionUsed ?? false;

  const topMetro = view.metropolisStack.length > 0 ? view.metropolisStack[0] : null;
  const canAffordMetro = canAffordCard('metropolis', view.yourHand, roads, subUsed);
  const canBuildMetro = isActive && topMetro !== null && canAffordMetro;

  // Taban kart boyutları büyütüldü: 74x108 px -> 96x140 px (~1.3x ölçek)
  const cardW = Math.round(96 * scale);
  const cardH = Math.round(140 * scale);

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-6 select-none relative my-2">
      {/* 1. SOL KENAR: Kapalı Kaynak Kartı Destesi (Altın/kahverengi desenli arka yüz) */}
      <div
        className="flex flex-col items-center gap-1.5 group cursor-pointer"
        onClick={() => onInspectCard('brick')}
        onContextMenu={(e) => {
          e.preventDefault();
          onInspectCard('brick');
        }}
        title={`Kaynak Destesi (${view.resourceDeckCount} kart)`}
      >
        <div
          style={{ width: `${cardW}px`, height: `${cardH}px` }}
          className="relative rounded-xl overflow-hidden border border-amber-800/80 shadow-2xl transition-transform hover:-translate-y-1 hover:shadow-amber-900/60 bg-amber-950"
        >
          {/* Çoklu deste katman efekti */}
          <div className="absolute inset-0 bg-amber-900/40 rounded-xl translate-x-1 translate-y-1 -z-10" />
          <img
            src="/assets/cards/resource/resource_back.png"
            alt="Kaynak Destesi (Altın/Kahverengi)"
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* Deste kart sayısı rozeti */}
          <div className="absolute bottom-1.5 right-1.5 bg-black/85 text-amber-300 text-xs font-black px-2 py-0.5 rounded shadow border border-amber-600/40 pointer-events-none">
            {view.resourceDeckCount}
          </div>
        </div>
        <span className="text-xs text-amber-200/90 font-bold tracking-tight">Kaynaklar</span>
      </div>

      {/* 2. ORTA: YATAY BEYAZ ÇERÇEVELİ "BUILDING ROW" ALANI */}
      <div className="relative border-2 border-white/70 rounded-2xl px-3.5 py-2.5 bg-black/35 backdrop-blur-xs shadow-2xl flex flex-col items-center">
        {/* Başlık Etiketi */}
        <div className="absolute -top-3 px-3.5 py-0.5 bg-gradient-to-r from-red-950 via-rose-950 to-red-950 text-white/90 text-xs tracking-widest uppercase font-extrabold border border-white/50 rounded-full shadow-md">
          building row
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 pt-1">
          {/* A. 1 ADET KAPALI İNŞAAT KARTI DESTESİ (Yeşil çekiç amblemli arka yüz) */}
          <div
            className="relative rounded-xl overflow-hidden border border-emerald-600/70 shadow-lg cursor-pointer group transition-transform hover:-translate-y-0.5 bg-emerald-950"
            style={{ width: `${cardW}px`, height: `${cardH}px` }}
            onClick={() => onInspectCard('settlement')}
            onContextMenu={(e) => {
              e.preventDefault();
              onInspectCard('settlement');
            }}
            title={`İnşaat Destesi (${view.buildingDeckCount} kart)`}
          >
            {/* Katman efekti */}
            <div className="absolute inset-0 bg-emerald-950/60 rounded-xl translate-x-0.5 translate-y-0.5 -z-10" />
            <img
              src="/assets/cards/building/building_back.png"
              alt="İnşaat Kartı Destesi (Yeşil Çekiç)"
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Deste kart sayısı rozeti */}
            <div className="absolute bottom-1.5 right-1.5 bg-black/85 text-emerald-300 text-xs font-black px-2 py-0.5 rounded shadow border border-emerald-500/40 pointer-events-none">
              {view.buildingDeckCount}
            </div>
            <div className="absolute top-1 left-1 bg-emerald-900/90 text-emerald-200 text-[9px] font-bold px-1.5 py-0.5 rounded pointer-events-none">
              Deste
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
                  <span className="text-[10px] uppercase">Boş</span>
                </div>
              );
            }

            const canAfford = isActive && canAffordCard(card.type, view.yourHand, roads, subUsed);

            return (
              <div
                key={card.id || index}
                className={`relative rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer ${
                  canAfford
                    ? 'border-amber-400/80 shadow-md hover:shadow-[0_0_25px_rgba(251,191,36,0.85)] hover:ring-2 hover:ring-yellow-400 hover:scale-105 hover:border-yellow-300'
                    : 'border-white/20 opacity-90 hover:opacity-100 hover:border-white/50 hover:scale-[1.02]'
                }`}
                style={{ width: `${cardW}px`, height: `${cardH}px` }}
                onClick={() => {
                  if (canAfford) {
                    onSelectBuild(card, 'row');
                  } else {
                    onInspectCard(card.type);
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
                title={
                  canAfford
                    ? `${card.type} (İnşa etmek için tıkla)`
                    : `${card.type} (İncelemek için tıkla)`
                }
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
        {/* BÜYÜKŞEHİR DESTESİ (Metropolis A veya B) YUVASI */}
        <div className="flex flex-col items-center gap-1.5">
          <div
            className={`relative rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer ${
              canBuildMetro
                ? 'border-yellow-400/80 shadow-md hover:shadow-[0_0_25px_rgba(251,191,36,0.85)] hover:ring-2 hover:ring-yellow-400 hover:scale-105 hover:border-yellow-300'
                : 'border-amber-900/40 opacity-90 hover:opacity-100 hover:border-amber-700/60 hover:scale-[1.02]'
            }`}
            style={{ width: `${cardW}px`, height: `${cardH}px` }}
            onClick={() => {
              if (canBuildMetro && topMetro) {
                onSelectBuild(topMetro, 'metropolis');
              } else if (topMetro) {
                onInspectCard('metropolis', topMetro.kind);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (topMetro) {
                onInspectCard('metropolis', topMetro.kind);
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (topMetro) {
                onInspectCard('metropolis', topMetro.kind);
              }
            }}
            title={
              topMetro
                ? canBuildMetro
                  ? 'Büyükşehir (İnşa etmek için tıkla)'
                  : 'Büyükşehir (İncelemek için tıkla)'
                : 'Büyükşehir (Tükendi)'
            }
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
          <span className="text-xs text-yellow-300/90 font-bold tracking-tight">B.Şehir</span>
        </div>

        {/* KAPALI OLAY KARTI DESTESİ (Gri Kelt motifli arka yüz) */}
        <div
          className="flex flex-col items-center gap-1.5 group cursor-pointer"
          onClick={() => onInspectCard('robber')}
          onContextMenu={(e) => {
            e.preventDefault();
            onInspectCard('robber');
          }}
          title={`Olay Destesi (${view.eventDeckCount} kart)`}
        >
          <div
            style={{ width: `${cardW}px`, height: `${cardH}px` }}
            className="relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl transition-transform hover:-translate-y-1 hover:shadow-slate-800 bg-slate-950"
          >
            <div className="absolute inset-0 bg-slate-800/40 rounded-xl translate-x-1 translate-y-1 -z-10" />
            <img
              src="/assets/cards/event/event_back.png"
              alt="Olay Destesi (Gri Kelt Motifi)"
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Deste kart sayısı rozeti */}
            <div className="absolute bottom-1.5 right-1.5 bg-black/85 text-slate-200 text-xs font-black px-2 py-0.5 rounded shadow border border-slate-500/40 pointer-events-none">
              {view.eventDeckCount}
            </div>
          </div>
          <span className="text-xs text-slate-300/90 font-bold tracking-tight">Olaylar</span>
        </div>
      </div>

      {/* Bonus Kart Rozetleri (En Uzun Yol & En Güçlü Ordu) */}
      <div className="hidden xl:flex flex-col gap-2 absolute -right-36 top-1 text-xs">
        <div
          onClick={() => onInspectCard('longest_route')}
          onContextMenu={(e) => {
            e.preventDefault();
            onInspectCard('longest_route');
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer backdrop-blur-xs transition ${
            view.longestRouteOwner
              ? 'border-amber-400 bg-amber-950/70 text-amber-200 shadow-md'
              : 'border-slate-800 bg-slate-900/50 text-slate-400'
          }`}
          title="En Uzun Yol (2 Zafer Puanı)"
        >
          <img src={getBonusImageUrl('longest_route')} alt="Yol" className="w-4 h-6 object-contain" />
          <span className="font-semibold">2 ZP Yol</span>
          {view.longestRouteOwner && (
            <span className="font-bold text-white">({view.players[view.longestRouteOwner]?.name})</span>
          )}
        </div>

        <div
          onClick={() => onInspectCard('largest_army')}
          onContextMenu={(e) => {
            e.preventDefault();
            onInspectCard('largest_army');
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer backdrop-blur-xs transition ${
            view.largestArmyOwner
              ? 'border-red-400 bg-red-950/70 text-red-200 shadow-md'
              : 'border-slate-800 bg-slate-900/50 text-slate-400'
          }`}
          title="En Güçlü Ordu (2 Zafer Puanı)"
        >
          <img src={getBonusImageUrl('largest_army')} alt="Ordu" className="w-4 h-6 object-contain" />
          <span className="font-semibold">2 ZP Ordu</span>
          {view.largestArmyOwner && (
            <span className="font-bold text-white">({view.players[view.largestArmyOwner]?.name})</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuildingRowMat;
