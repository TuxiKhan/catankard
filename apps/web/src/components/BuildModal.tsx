import React, { useState } from 'react';
import type { BuildingCard, MetropolisCard, PlayerView, Resource } from '@catankard/engine';
import { getBuildingImageUrl, getMetropolisImageUrl } from '../lib/cardImages.ts';

interface BuildModalProps {
  card: BuildingCard | MetropolisCard;
  source: 'row' | 'metropolis';
  view: PlayerView;
  onClose: () => void;
  onConfirm: (substitution?: { replace: Resource; pay: Resource }) => Promise<void>;
}

const RESOURCE_NAMES: Record<Resource, string> = {
  brick: 'Tuğla',
  wood: 'Odun',
  wool: 'Yün',
  wheat: 'Buğday',
  ore: 'Cevher',
};

const COSTS: Record<string, Partial<Record<Resource, number>>> = {
  road: { brick: 1, wood: 1 },
  knight: { wool: 1, wheat: 1, ore: 1 },
  settlement: { brick: 1, wood: 1, wool: 1, wheat: 1 },
  city: { wheat: 2, ore: 3 },
  metropolis: { wool: 3, ore: 1 },
};

export const BuildModal: React.FC<BuildModalProps> = ({
  card,
  source,
  view,
  onClose,
  onConfirm,
}) => {
  const cardType = source === 'row' ? (card as BuildingCard).type : 'metropolis';
  const baseCost = COSTS[cardType] || {};
  const hand = view.yourHand;
  const roads = view.players[view.you]?.area?.roads ?? 1;

  // Yol ikame oranı: 1 yol -> 4:1, 2 yol -> 3:1, 3 yol -> 2:1, 4+ yol -> 1:1
  const ratio = roads <= 1 ? 4 : roads === 2 ? 3 : roads === 3 ? 2 : 1;
  const canUseSubstitution = !view.turnFlags.roadSubstitutionUsed;

  // Eksik kaynakları tespit et
  const missingResources: { resource: Resource; needed: number }[] = [];
  (Object.keys(baseCost) as Resource[]).forEach((res) => {
    const required = baseCost[res] || 0;
    const have = hand[res] || 0;
    if (have < required) {
      missingResources.push({ resource: res, needed: required - have });
    }
  });

  const isExactAffordable = missingResources.length === 0;

  // İkame opsiyonları (Yalnızca tam olarak 1 kaynak eksikse kullanılabilir)
  const substitutionOptions: { replace: Resource; pay: Resource }[] = [];
  if (canUseSubstitution && missingResources.length === 1) {
    const firstMissing = missingResources[0];
    if (firstMissing && firstMissing.needed === 1) {
      const missingRes = firstMissing.resource;
      (['brick', 'wood', 'wool', 'wheat', 'ore'] as Resource[]).forEach((payRes) => {
        if (payRes !== missingRes) {
          const requiredPay = (baseCost[payRes] || 0) + ratio;
          if ((hand[payRes] || 0) >= requiredPay) {
            substitutionOptions.push({ replace: missingRes, pay: payRes });
          }
        }
      });
    }
  }

  const [selectedSub, setSelectedSub] = useState<{ replace: Resource; pay: Resource } | null>(
    substitutionOptions.length > 0 ? substitutionOptions[0]! : null
  );
  const [submitting, setSubmitting] = useState(false);

  const handleBuild = async () => {
    try {
      setSubmitting(true);
      if (isExactAffordable) {
        await onConfirm();
      } else if (selectedSub) {
        await onConfirm(selectedSub);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
        <div className="text-center mb-4">
          <h3 className="text-lg font-black text-amber-400 uppercase tracking-wider">
            İnşaat Onayı
          </h3>
          <p className="text-xs text-slate-400 capitalize">
            {cardType === 'metropolis' ? 'Büyükşehir' : cardType}
          </p>
        </div>

        {/* Kart Görseli Önizleme */}
        <div className="h-44 w-full flex items-center justify-center mb-4 bg-slate-950/60 rounded-2xl p-2 border border-slate-800">
          <img
            src={
              source === 'row'
                ? getBuildingImageUrl((card as BuildingCard).type)
                : getMetropolisImageUrl(card as MetropolisCard)
            }
            alt={cardType}
            className="h-full object-contain filter drop-shadow-md"
          />
        </div>

        {/* Maliyet & Durum */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 mb-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1.5">
            Gerekli Kaynaklar
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(baseCost) as Resource[]).map((res) => {
              const req = baseCost[res] || 0;
              const current = hand[res] || 0;
              const hasEnough = current >= req;
              return (
                <div
                  key={res}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 ${
                    hasEnough
                      ? 'border-emerald-600/60 bg-emerald-950/30 text-emerald-300'
                      : 'border-red-600/60 bg-red-950/30 text-red-300'
                  }`}
                >
                  <span>{RESOURCE_NAMES[res]}</span>
                  <span className="font-bold">
                    {current}/{req}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Yol İkamesi Seçeneği */}
        {!isExactAffordable && substitutionOptions.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-3 mb-4 text-xs">
            <span className="font-bold text-amber-300 block mb-1">
              🛣️ Yol Takası Avantajı ({ratio}:1)
            </span>
            <p className="text-[11px] text-amber-200/80 mb-2">
              {roads} yolun olduğu için eksik 1 kaynağı {ratio} adet başka kaynakla ikame edebilirsin!
            </p>
            <div className="space-y-1.5">
              {substitutionOptions.map((opt) => (
                <label
                  key={opt.pay}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                    selectedSub?.pay === opt.pay
                      ? 'border-amber-400 bg-amber-500/20 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="substitution"
                      checked={selectedSub?.pay === opt.pay}
                      onChange={() => setSelectedSub(opt)}
                      className="accent-amber-500"
                    />
                    <span>
                      {ratio}x <strong>{RESOURCE_NAMES[opt.pay]}</strong> ver
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-bold">
                    → 1x {RESOURCE_NAMES[opt.replace]} yerine
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Kaynak Yetersiz Uyarısı */}
        {!isExactAffordable && substitutionOptions.length === 0 && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3 mb-4 text-xs text-red-300">
            İnşaat için yeterli kaynağınız bulunmuyor ve yol takası imkanı mevcut değil.
          </div>
        )}

        {/* Butonlar */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleBuild}
            disabled={(!isExactAffordable && !selectedSub) || submitting}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition shadow disabled:opacity-40"
          >
            {submitting ? 'İnşa Ediliyor...' : 'İnşa Et'}
          </button>
        </div>
      </div>
    </div>
  );
};
