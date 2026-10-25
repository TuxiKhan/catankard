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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-slate-900 border-2 border-red-600 rounded-2xl max-w-lg w-full p-3.5 sm:p-5 shadow-2xl text-slate-100 max-h-[94dvh] overflow-y-auto animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between gap-2 text-red-400 mb-2.5">
          <div className="flex items-center gap-2.5">
            <Skull size={26} className="shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">Hırsız Baskını!</h2>
              <p className="text-[11px] text-red-300 leading-tight">
                El limitini aştınız! Elinizdeki kartların yarısını ıskartaya atmalısınız.
              </p>
            </div>
          </div>
          <div className="bg-red-950/60 border border-red-800 rounded-lg px-2.5 py-1 text-right shrink-0">
            <div className="text-[10px] text-red-300">Seçilen</div>
            <div className="font-black text-red-200 text-sm sm:text-base">
              {selectedCount} / {robberDec.count}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/60 border border-red-500 rounded p-2 mb-2.5 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          {RESOURCES.map((r) => {
            const available = view.yourHand[r] || 0;
            return (
              <div key={r} className="flex items-center justify-between bg-slate-800/80 px-2.5 py-1.5 sm:py-2 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2">
                  <img src={getResourceImageUrl(r)} alt={r} className="w-5 h-7 object-contain" />
                  <span className="text-xs sm:text-sm font-medium">{RES_NAMES[r]} ({available})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCards((prev) => ({ ...prev, [r]: Math.max(0, prev[r] - 1) }))}
                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-5 text-center text-xs sm:text-sm font-bold text-red-400">{cards[r]}</span>
                  <button
                    type="button"
                    disabled={selectedCount >= robberDec.count || cards[r] >= available}
                    onClick={() => setCards((prev) => ({ ...prev, [r]: prev[r] + 1 }))}
                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-40"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || remaining !== 0}
          className="w-full py-2.5 sm:py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition disabled:opacity-50 shadow-lg text-xs sm:text-sm"
        >
          {loading ? 'İşleniyor...' : remaining === 0 ? 'Kartları Iskarta Et' : `${remaining} Kart Daha Seçin`}
        </button>
      </div>
    </div>
  );
};
