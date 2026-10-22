import React, { useState } from 'react';
import { Skull, Minus, Plus } from 'lucide-react';
import type { PlayerView, Resource, ResourceCounts } from '@catankard/engine';
import { getResourceImageUrl } from '../lib/cardImages.ts';

interface RobberModalProps {
  view: PlayerView;
  onDiscard: (decisionId: string, cards: ResourceCounts) => Promise<void>;
}

const RESOURCES: Resource[] = ['brick', 'wood', 'wool', 'wheat', 'ore'];
const RES_NAMES: Record<Resource, string> = {
  brick: 'Tuğla',
  wood: 'Odun',
  wool: 'Yün',
  wheat: 'Buğday',
  ore: 'Demir',
};

export const RobberModal: React.FC<RobberModalProps> = ({ view, onDiscard }) => {
  const robberDec = view.pendingDecisions.find(
    (d) => d.playerId === view.you && d.kind === 'robber_discard'
  ) as { id: string; kind: 'robber_discard'; playerId: string; count: number; deadline: number } | undefined;

  const [cards, setCards] = useState<ResourceCounts>({
    brick: 0,
    wood: 0,
    wool: 0,
    wheat: 0,
    ore: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!robberDec) return null;

  const selectedCount = Object.values(cards).reduce((a, b) => a + b, 0);
  const remaining = robberDec.count - selectedCount;

  const handleSubmit = async () => {
    if (selectedCount !== robberDec.count) {
      setError(`Tam olarak ${robberDec.count} kart seçmelisiniz.`);
      return;
    }

    try {
      setLoading(true);
      await onDiscard(robberDec.id, cards);
    } catch (err: any) {
      setError(err.message || 'Kart atma işlemi başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border-2 border-red-600 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-3 text-red-400 mb-3">
          <Skull size={32} />
          <div>
            <h2 className="text-xl font-bold">Hırsız Baskını!</h2>
            <p className="text-xs text-red-300">
              El limitini aştınız! Elinizdeki kartların yarısını ıskartaya atmalısınız.
            </p>
          </div>
        </div>

        <div className="bg-red-950/40 border border-red-800 rounded-lg p-3 mb-4 text-sm flex justify-between items-center">
          <span>Atılması Gereken:</span>
          <span className="font-bold text-red-300 text-lg">
            {selectedCount} / {robberDec.count} kart
          </span>
        </div>

        {error && (
          <div className="bg-red-900/60 border border-red-500 rounded p-2 mb-3 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-2 mb-6">
          {RESOURCES.map((r) => {
            const available = view.yourHand[r] || 0;
            return (
              <div key={r} className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2.5">
                  <img src={getResourceImageUrl(r)} alt={r} className="w-6 h-8 object-contain" />
                  <span className="text-sm font-medium">{RES_NAMES[r]} (Elinde: {available})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCards((prev) => ({ ...prev, [r]: Math.max(0, prev[r] - 1) }))}
                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-red-400">{cards[r]}</span>
                  <button
                    type="button"
                    disabled={selectedCount >= robberDec.count || cards[r] >= available}
                    onClick={() => setCards((prev) => ({ ...prev, [r]: prev[r] + 1 }))}
                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-40"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || remaining !== 0}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition disabled:opacity-50 shadow-lg text-sm"
        >
          {loading ? 'İşleniyor...' : remaining === 0 ? 'Kartları Iskarta Et' : `${remaining} Kart Daha Seçin`}
        </button>
      </div>
    </div>
  );
};
