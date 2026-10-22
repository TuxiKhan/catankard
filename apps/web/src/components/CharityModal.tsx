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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-emerald-600 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100">
        <div className="flex items-center gap-3 text-emerald-400 mb-3">
          <HeartHandshake size={32} />
          <div>
            <h2 className="text-xl font-bold">Sadaka (Charity)!</h2>
            <p className="text-xs text-emerald-300">
              En yüksek Zafer Puanına sahipsiniz! Daha az puanlı bir oyuncuya 1 kaynak vermelisiniz.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/60 border border-red-500 rounded p-2 mb-3 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">Kime Verilecek?</label>
          <div className="grid grid-cols-2 gap-2">
            {charityDec.candidates.map((candId) => {
              const name = view.players[candId]?.name || 'Oyuncu';
              const vp = view.players[candId]?.visibleVP || 0;
              const isSelected = (toPlayerId || charityDec.candidates[0]) === candId;

              return (
                <button
                  key={candId}
                  type="button"
                  onClick={() => setToPlayerId(candId)}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/50 text-white font-bold'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="text-sm">{name}</div>
                  <div className="text-xs text-slate-400">{vp} Zafer Puanı</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">Hangi Kaynağı Vereceksiniz?</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                  className={`flex flex-col items-center p-2 rounded-xl border transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-900/40 ring-2 ring-emerald-500'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                  } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <img src={getResourceImageUrl(r)} alt={r} className="w-8 h-12 object-contain mb-1" />
                  <span className="text-xs font-bold">{count} adet</span>
                  <span className="text-[10px] text-slate-400">{RES_NAMES[r]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleGive}
          disabled={loading || !resource}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition disabled:opacity-50 text-sm shadow-lg"
        >
          {loading ? 'İletiliyor...' : 'Sadakayı Ver'}
        </button>
      </div>
    </div>
  );
};
