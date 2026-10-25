import React, { useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import type { PlayerView, Resource } from '@catankard/engine';
import { getResourceImageUrl } from '../lib/cardImages.ts';

interface CharityModalProps {
  view: PlayerView;
  onGive: (decisionId: string, toPlayerId: string, resource: Resource) => Promise<void>;
}

const RESOURCES: Resource[] = ['brick', 'wood', 'wool', 'wheat', 'ore'];
const RES_NAMES: Record<Resource, string> = {
  brick: 'Tuğla',
  wood: 'Odun',
  wool: 'Yün',
  wheat: 'Buğday',
  ore: 'Demir',
};

export const CharityModal: React.FC<CharityModalProps> = ({ view, onGive }) => {
  const charityDec = view.pendingDecisions.find(
    (d) => d.playerId === view.you && d.kind === 'charity_give'
  ) as { id: string; kind: 'charity_give'; playerId: string; candidates: string[]; deadline: number } | undefined;

  const [toPlayerId, setToPlayerId] = useState<string>('');
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!charityDec) return null;

  const targetPlayer = toPlayerId || charityDec.candidates[0] || '';

  const handleGive = async () => {
    if (!resource) {
      setError('Lütfen vereceğiniz kaynak kartını seçin.');
      return;
    }
    if (!targetPlayer) {
      setError('Lütfen sadaka verilecek oyuncuyu seçin.');
      return;
    }

    try {
      setLoading(true);
      await onGive(charityDec.id, targetPlayer, resource);
    } catch (err: any) {
      setError(err.message || 'Sadaka verilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-slate-900 border-2 border-emerald-600 rounded-2xl max-w-lg w-full p-3.5 sm:p-5 shadow-2xl text-slate-100 max-h-[94dvh] overflow-y-auto">
        <div className="flex items-center gap-2.5 text-emerald-400 mb-2.5">
          <HeartHandshake size={26} className="shrink-0" />
          <div>
            <h2 className="text-base sm:text-lg font-bold leading-tight">Sadaka (Charity)!</h2>
            <p className="text-[11px] text-emerald-300 leading-tight">
              En yüksek Zafer Puanına sahipsiniz! Daha az puanlı bir oyuncuya 1 kaynak vermelisiniz.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/60 border border-red-500 rounded p-2 mb-2.5 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="mb-2.5 sm:mb-3.5">
          <label className="text-xs font-semibold text-slate-300 block mb-1">Kime Verilecek?</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
            {charityDec.candidates.map((candId) => {
              const name = view.players[candId]?.name || 'Oyuncu';
              const vp = view.players[candId]?.visibleVP || 0;
              const isSelected = (toPlayerId || charityDec.candidates[0]) === candId;

              return (
                <button
                  key={candId}
                  type="button"
                  onClick={() => setToPlayerId(candId)}
                  className={`px-2.5 py-1.5 sm:p-2 rounded-lg border text-left transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/50 text-white font-bold'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="text-xs sm:text-sm truncate">{name}</div>
                  <div className="text-[10px] sm:text-xs text-slate-400">{vp} Zafer Puanı</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3 sm:mb-4">
          <label className="text-xs font-semibold text-slate-300 block mb-1">Hangi Kaynağı Vereceksiniz?</label>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {RESOURCES.map((r) => {
              const count = view.yourHand[r] || 0;
              const isSelected = resource === r;
              const disabled = count <= 0;

              return (
                <button
                  key={r}
                  type="button"
                  disabled={disabled}
                  onClick={() => setResource(r)}
                  className={`flex flex-col items-center p-1.5 sm:p-2 rounded-xl border transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-900/40 ring-2 ring-emerald-500'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                  } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <img src={getResourceImageUrl(r)} alt={r} className="w-7 h-10 sm:w-8 sm:h-12 object-contain mb-0.5" />
                  <span className="text-[11px] sm:text-xs font-bold">{count} adet</span>
                  <span className="text-[9px] sm:text-[10px] text-slate-400">{RES_NAMES[r]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleGive}
          disabled={loading || !resource}
          className="w-full py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition disabled:opacity-50 text-xs sm:text-sm shadow-lg"
        >
          {loading ? 'İletiliyor...' : 'Sadakayı Ver'}
        </button>
      </div>
    </div>
  );
};
