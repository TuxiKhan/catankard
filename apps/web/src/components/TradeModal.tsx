import React, { useState } from 'react';
import { X, ArrowRightLeft, Gift, Plus, Minus } from 'lucide-react';
import type { PlayerView, Resource, ResourceCounts, TradeOffer } from '@catankard/engine';
import { getResourceImageUrl } from '../lib/cardImages.ts';

interface TradeModalProps {
  view: PlayerView;
  isOpen: boolean;
  onClose: () => void;
  onProposeTrade: (toPlayerId: string | null, give: ResourceCounts, want: ResourceCounts) => Promise<void>;
  onAcceptTrade: (offerId: string) => Promise<void>;
  onCancelTrade: (offerId: string) => Promise<void>;
}

const RESOURCES: Resource[] = ['brick', 'wood', 'wool', 'wheat', 'ore'];
const RES_NAMES: Record<Resource, string> = {
  brick: 'Tuğla',
  wood: 'Odun',
  wool: 'Yün',
  wheat: 'Buğday',
  ore: 'Demir',
};

export const TradeModal: React.FC<TradeModalProps> = ({
  view,
  isOpen,
  onClose,
  onProposeTrade,
  onAcceptTrade,
  onCancelTrade,
}) => {
  if (!isOpen) return null;

  const [toPlayerId, setToPlayerId] = useState<string | null>(null);
  const [give, setGive] = useState<ResourceCounts>({ brick: 0, wood: 0, wool: 0, wheat: 0, ore: 0 });
  const [want, setWant] = useState<ResourceCounts>({ brick: 0, wood: 0, wool: 0, wheat: 0, ore: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = view.activePlayerId === view.you;
  const otherPlayers = Object.entries(view.players).filter(([id]) => id !== view.you);

  const handlePropose = async () => {
    setError(null);
    const giveTotal = Object.values(give).reduce((a, b) => a + b, 0);
    const wantTotal = Object.values(want).reduce((a, b) => a + b, 0);

    if (giveTotal === 0 || wantTotal === 0) {
      setError('En az 1 kaynak verip 1 kaynak istemelisiniz (karşılıksız hediye yasaktır).');
      return;
    }

    for (const r of RESOURCES) {
      if (give[r] > 0 && want[r] > 0) {
        setError(`Aynı kaynak (${RES_NAMES[r]}) hem verilip hem alınamaz.`);
        return;
      }
    }

    try {
      setLoading(true);
      await onProposeTrade(toPlayerId, give, want);
      setGive({ brick: 0, wood: 0, wool: 0, wheat: 0, ore: 0 });
      setWant({ brick: 0, wood: 0, wool: 0, wheat: 0, ore: 0 });
    } catch (err: any) {
      setError(err.message || 'Teklif gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const openOffers = view.tradeOffers.filter((o) => o.status === 'open');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative bg-slate-800 border-2 border-amber-600 rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-700/50 hover:bg-slate-700"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <ArrowRightLeft className="text-amber-400" size={24} />
          <h2 className="text-xl font-bold text-white">Ticaret / Takas</h2>
        </div>

        <div className="bg-amber-950/40 border border-amber-700/50 rounded-lg p-3 mb-4 text-xs text-amber-200">
          💡 <strong>Resmi Kural:</strong> Turda 1 kez, tek bir oyuncuyla takas yapılır. Aktif oyuncuyla takas yapan <strong>diğer oyuncu</strong>, işlem sonunda desteden <strong>1 bonus kaynak kartı</strong> çeker!
        </div>

        {error && (
          <div className="bg-red-950/60 border border-red-500 rounded-lg p-2.5 mb-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Açık Teklifler Bölümü */}
        {openOffers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase text-slate-400 mb-2">Mevcut Teklifler</h3>
            <div className="space-y-2">
              {openOffers.map((offer) => {
                const isMine = offer.fromPlayerId === view.you;
                const proposerName = view.players[offer.fromPlayerId]?.name || 'Oyuncu';
                const canAccept = !isMine && (isActive || offer.fromPlayerId === view.activePlayerId);

                return (
                  <div
                    key={offer.id}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="text-xs text-amber-400 font-semibold mb-1">
                        {isMine ? 'Senin Teklifin' : `${proposerName} Teklifi`}:
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <span className="text-emerald-400 font-medium">Verir:</span>
                        {renderResourceCounts(offer.give)}
                        <span className="text-slate-500 mx-1">➔</span>
                        <span className="text-amber-400 font-medium">İster:</span>
                        {renderResourceCounts(offer.want)}
                      </div>
                    </div>

                    {isMine ? (
                      <button
                        onClick={() => onCancelTrade(offer.id)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs font-semibold"
                      >
                        İptal Et
                      </button>
                    ) : canAccept ? (
                      <button
                        onClick={() => onAcceptTrade(offer.id)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                      >
                        Kabul Et
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Yeni Teklif Oluştur */}
        {!view.turnFlags.traded ? (
          <div>
            <h3 className="text-sm font-semibold uppercase text-slate-400 mb-3">Yeni Teklif Oluştur</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Vereceğin Kaynaklar */}
              <div className="bg-slate-900/90 border border-emerald-900/60 rounded-xl p-3">
                <span className="text-xs font-bold uppercase text-emerald-400 block mb-2">Vereceğin (Elinden)</span>
                <div className="space-y-2">
                  {RESOURCES.map((r) => {
                    const available = view.yourHand[r] || 0;
                    return (
                      <div key={r} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={getResourceImageUrl(r)} alt={r} className="w-5 h-7 object-contain" />
                          <span className="text-xs text-slate-300">{RES_NAMES[r]} ({available})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setGive((prev) => ({ ...prev, [r]: Math.max(0, prev[r] - 1) }))}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-4 text-center text-xs font-bold text-white">{give[r]}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setGive((prev) => ({ ...prev, [r]: Math.min(available, prev[r] + 1) }))
                            }
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* İstediğin Kaynaklar */}
              <div className="bg-slate-900/90 border border-amber-900/60 rounded-xl p-3">
                <span className="text-xs font-bold uppercase text-amber-400 block mb-2">İstediğin</span>
                <div className="space-y-2">
                  {RESOURCES.map((r) => (
                    <div key={r} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={getResourceImageUrl(r)} alt={r} className="w-5 h-7 object-contain" />
                        <span className="text-xs text-slate-300">{RES_NAMES[r]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setWant((prev) => ({ ...prev, [r]: Math.max(0, prev[r] - 1) }))}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-4 text-center text-xs font-bold text-white">{want[r]}</span>
                        <button
                          type="button"
                          onClick={() => setWant((prev) => ({ ...prev, [r]: prev[r] + 1 }))}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Hedef Oyuncu Seçimi */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-slate-400">Kime:</span>
              <select
                value={toPlayerId ?? ''}
                onChange={(e) => setToPlayerId(e.target.value ? e.target.value : null)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
              >
                <option value="">Herkese Açık Teklif</option>
                {otherPlayers.map(([id, p]) => (
                  <option key={id} value={id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePropose}
              disabled={loading}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold rounded-lg text-sm transition shadow-lg disabled:opacity-50"
            >
              {loading ? 'Teklif İletiliyor...' : 'Teklifi İlan Et'}
            </button>
          </div>
        ) : (
          <div className="text-center text-slate-400 py-4 text-sm">
            Bu tur zaten bir takas yapıldı. Tur başına yalnızca 1 takasa izin verilir.
          </div>
        )}
      </div>
    </div>
  );
};

function renderResourceCounts(counts: ResourceCounts) {
  const parts: string[] = [];
  for (const r of RESOURCES) {
    if (counts[r] > 0) {
      parts.push(`${counts[r]}× ${RES_NAMES[r]}`);
    }
  }
  return <span>{parts.join(', ')}</span>;
}
