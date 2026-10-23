import React from 'react';
import type { BuildingCard, MetropolisCard, PlayerView } from '@catankard/engine';
import {
  getBonusImageUrl,
  getBuildingImageUrl,
  getMetropolisImageUrl,
} from '../lib/cardImages.ts';

export interface BuildingRowMatProps {
  view: PlayerView;
  onInspectCard: (type: any, subKind?: any) => void;
  onSelectBuild: (card: BuildingCard | MetropolisCard, source: 'row' | 'metropolis') => void;
  canBuildMetropolis: boolean;
  scale?: number;
}

export const BuildingRowMat: React.FC<BuildingRowMatProps> = ({
  view,
  onInspectCard,
  onSelectBuild,
  canBuildMetropolis,
  scale = 1,
}) => {
  const isActive = view.activePlayerId === view.you && view.phase === 'action';
  const topMetro = view.metropolisStack.length > 0 ? view.metropolisStack[0] : null;

  const cardW = 74 * scale;
  const cardH = 108 * scale;

  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 md:gap-5 select-none relative my-2">
      {/* 1. SOL KENAR: Kapalı Kaynak Kartı Destesi (Altın/kahverengi desenli arka yüz) */}
      <div
        className="flex flex-col items-center gap-1 group cursor-pointer"
        onClick={() => onInspectCard('brick')}
        title={`Kaynak Destesi (${view.resourceDeckCount} kart)`}
      >
        <div
          style={{ width: `${cardW}px`, height: `${cardH}px` }}
          className="relative rounded-lg overflow-hidden border border-amber-800/80 shadow-2xl transition-transform hover:-translate-y-1 hover:shadow-amber-900/60 bg-amber-950"
        >
          {/* Çoklu deste katman efekti */}
          <div className="absolute inset-0 bg-amber-900/40 rounded-lg translate-x-1 translate-y-1 -z-10" />
          <img
            src="/assets/cards/resource/resource_back.png"
            alt="Kaynak Destesi (Altın/Kahverengi)"
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* Deste kart sayısı rozeti */}
          <div className="absolute bottom-1 right-1 bg-black/85 text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded shadow border border-amber-600/40">
            {view.resourceDeckCount}
          </div>
        </div>
        <span className="text-[10px] text-amber-200/90 font-bold tracking-tight">Kaynaklar</span>
      </div>

      {/* 2. ORTA: YATAY BEYAZ ÇERÇEVELİ "BUILDING ROW" ALANI */}
      <div className="relative border-2 border-white/70 rounded-2xl px-3 py-2 bg-black/35 backdrop-blur-xs shadow-2xl flex flex-col items-center">
        {/* Başlık Etiketi */}
        <div className="absolute -top-2.5 px-3 py-0.2 bg-gradient-to-r from-red-950 via-rose-950 to-red-950 text-white/90 text-[10px] tracking-widest uppercase font-extrabold border border-white/50 rounded-full shadow-md">
          building row
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 pt-1">
          {/* A. 1 ADET KAPALI İNŞAAT KARTI DESTESİ (Yeşil çekiç amblemli arka yüz) */}
          <div
            className="relative rounded-lg overflow-hidden border border-emerald-600/70 shadow-lg cursor-pointer group transition-transform hover:-translate-y-0.5 bg-emerald-950"
            style={{ width: `${cardW}px`, height: `${cardH}px` }}
            onClick={() => onInspectCard('settlement')}
            title={`İnşaat Destesi (${view.buildingDeckCount} kart)`}
          >
            {/* Katman efekti */}
            <div className="absolute inset-0 bg-emerald-950/60 rounded-lg translate-x-0.5 translate-y-0.5 -z-10" />
            <img
              src="/assets/cards/building/building_back.png"
              alt="İnşaat Kartı Destesi (Yeşil Çekiç)"
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Deste kart sayısı rozeti */}
            <div className="absolute bottom-1 right-1 bg-black/85 text-emerald-300 text-[10px] font-black px-1.5 py-0.5 rounded shadow border border-emerald-500/40">
              {view.buildingDeckCount}
            </div>
            <div className="absolute top-1 left-1 bg-emerald-900/90 text-emerald-200 text-[8px] font-bold px-1 rounded">
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
                  className="rounded-lg border-2 border-dashed border-stone-600/50 bg-stone-900/20 flex flex-col items-center justify-center text-stone-500"
                  style={{ width: `${cardW}px`, height: `${cardH}px` }}
                >
                  <span className="text-[10px] font-bold">#{index + 1}</span>
                  <span className="text-[8px] uppercase">Boş</span>
                </div>
              );
            }

            return (
              <div
                key={card.id || index}
                className={`relative rounded-lg overflow-hidden border transition-all duration-200 group ${
                  isActive
                    ? 'border-amber-400/90 ring-1 ring-amber-400/40 shadow-lg hover:border-amber-300 hover:scale-105 cursor-pointer'
                    : 'border-white/30 opacity-95 hover:border-white/60'
                }`}
                style={{ width: `${cardW}px`, height: `${cardH}px` }}
                onClick={() => {
                  if (isActive) {
                    onSelectBuild(card, 'row');
                  } else {
                    onInspectCard(card.type);
                  }
                }}
              >
                <img
                  src={getBuildingImageUrl(card.type)}
                  alt={card.type}
                  className="w-full h-full object-cover"
                  draggable={false}
                />

                {/* Kartların Altına Tıklanınca İnceleme veya İnşaat Tetikleyicisi */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                  {isActive ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBuild(card, 'row');
                      }}
                      className="w-full py-1 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-[10px] font-black rounded shadow"
                    >
                      İnşa Et
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectCard(card.type);
                    }}
                    className="w-full py-0.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[9px] font-semibold rounded"
                  >
                    İncele
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SAĞ KENAR: Büyükşehir Destesi & Kapalı Olay Kartı Destesi */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* BÜYÜKŞEHİR DESTESİ (Metropolis A veya B) YUVASI */}
        <div className="flex flex-col items-center gap-1">
          <div
            className={`relative rounded-lg overflow-hidden border transition-all duration-200 group ${
              canBuildMetropolis && isActive
                ? 'border-yellow-400 ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-500/30 cursor-pointer hover:scale-105'
                : 'border-amber-700/50 opacity-95'
            }`}
            style={{ width: `${cardW}px`, height: `${cardH}px` }}
            onClick={() => {
              if (canBuildMetropolis && isActive && topMetro) {
                onSelectBuild(topMetro, 'metropolis');
              } else if (topMetro) {
                onInspectCard('metropolis', topMetro.kind);
              }
            }}
            title="Büyükşehir Destesi (Metropolis)"
          >
            {topMetro ? (
              <img
                src={getMetropolisImageUrl(topMetro)}
                alt="Büyükşehir"
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-slate-900/90 flex items-center justify-center text-[9px] text-slate-400 font-bold">
                Tükendi
              </div>
            )}

            {/* Deste Adedi Rozeti */}
            <div className="absolute top-1 right-1 bg-yellow-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded shadow">
              x{view.metropolisStack.length}
            </div>

            {/* Aksiyon Katmanı */}
            {canBuildMetropolis && isActive && topMetro && (
              <div className="absolute inset-0 bg-yellow-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                <span className="text-[10px] font-black bg-yellow-400 text-slate-950 px-1.5 py-0.5 rounded shadow text-center">
                  B.Şehir Kur
                </span>
              </div>
            )}
          </div>
          <span className="text-[10px] text-yellow-300/90 font-bold tracking-tight">B.Şehir</span>
        </div>

        {/* KAPALI OLAY KARTI DESTESİ (Gri Kelt motifli arka yüz) */}
        <div
          className="flex flex-col items-center gap-1 group cursor-pointer"
          onClick={() => onInspectCard('robber')}
          title={`Olay Destesi (${view.eventDeckCount} kart)`}
        >
          <div
            style={{ width: `${cardW}px`, height: `${cardH}px` }}
            className="relative rounded-lg overflow-hidden border border-slate-700 shadow-2xl transition-transform hover:-translate-y-1 hover:shadow-slate-800 bg-slate-950"
          >
            <div className="absolute inset-0 bg-slate-800/40 rounded-lg translate-x-1 translate-y-1 -z-10" />
            <img
              src="/assets/cards/event/event_back.png"
              alt="Olay Destesi (Gri Kelt Motifi)"
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Deste kart sayısı rozeti */}
            <div className="absolute bottom-1 right-1 bg-black/85 text-slate-200 text-[10px] font-black px-1.5 py-0.5 rounded shadow border border-slate-500/40">
              {view.eventDeckCount}
            </div>
          </div>
          <span className="text-[10px] text-slate-300/90 font-bold tracking-tight">Olaylar</span>
        </div>
      </div>

      {/* Bonus Kart Rozetleri (En Uzun Yol & En Güçlü Ordu) */}
      <div className="hidden xl:flex flex-col gap-1.5 absolute -right-28 top-1 text-[10px]">
        <div
          onClick={() => onInspectCard('longest_route')}
          className={`flex items-center gap-1 px-2 py-1 rounded-md border cursor-pointer backdrop-blur-xs transition ${
            view.longestRouteOwner
              ? 'border-amber-400 bg-amber-950/70 text-amber-200 shadow-md'
              : 'border-slate-800 bg-slate-900/50 text-slate-400'
          }`}
          title="En Uzun Yol (2 Zafer Puanı)"
        >
          <img src={getBonusImageUrl('longest_route')} alt="Yol" className="w-3.5 h-5 object-contain" />
          <span className="font-semibold">2 ZP Yol</span>
          {view.longestRouteOwner && (
            <span className="font-bold text-white">({view.players[view.longestRouteOwner]?.name})</span>
          )}
        </div>

        <div
          onClick={() => onInspectCard('largest_army')}
          className={`flex items-center gap-1 px-2 py-1 rounded-md border cursor-pointer backdrop-blur-xs transition ${
            view.largestArmyOwner
              ? 'border-red-400 bg-red-950/70 text-red-200 shadow-md'
              : 'border-slate-800 bg-slate-900/50 text-slate-400'
          }`}
          title="En Güçlü Ordu (2 Zafer Puanı)"
        >
          <img src={getBonusImageUrl('largest_army')} alt="Ordu" className="w-3.5 h-5 object-contain" />
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
