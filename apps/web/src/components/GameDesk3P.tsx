import React, { useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  LogOut,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import type { BuildingCard, MetropolisCard, PlayerView } from '@catankard/engine';
import { BuildingRow } from './BuildingRow.tsx';
import { PlayerDesk } from './PlayerDesk.tsx';

interface GameDesk3PProps {
  view: PlayerView;
  onInspectCard: (type: any, subKind?: any) => void;
  onOpenTrade: () => void;
  onEndTurn: () => Promise<void>;
  onBuild: (cardId: string, source: 'row' | 'metropolis', onStackId?: string) => Promise<void>;
  onLeaveGame: () => void;
}

export const GameDesk3P: React.FC<GameDesk3PProps> = ({
  view,
  onInspectCard,
  onOpenTrade,
  onEndTurn,
  onBuild,
  onLeaveGame,
}) => {
  const [selectedStackId, setSelectedStackId] = useState<string | null>(null);
  const [pendingUpgrade, setPendingUpgrade] = useState<{
    cardId: string;
    source: 'row' | 'metropolis';
    type: 'city' | 'metropolis';
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const isActive = view.activePlayerId === view.you && view.phase === 'action';
  const opponents = view.turnOrder.filter((id) => id !== view.you);

  // Kalan süre göstergesi
  const remainingSeconds = view.turnDeadline
    ? Math.max(0, Math.round((view.turnDeadline - Date.now()) / 1000))
    : null;

  const handleBuildFromRow = async (card: BuildingCard) => {
    if (card.type === 'city') {
      setPendingUpgrade({ cardId: card.id, source: 'row', type: 'city' });
      return;
    }

    try {
      setLoading(true);
      await onBuild(card.id, 'row');
    } finally {
      setLoading(false);
    }
  };

  const handleBuildMetropolis = async (metro: MetropolisCard) => {
    setPendingUpgrade({ cardId: metro.id, source: 'metropolis', type: 'metropolis' });
  };

  const handleConfirmUpgrade = async (stackId: string) => {
    if (!pendingUpgrade) return;
    try {
      setLoading(true);
      await onBuild(pendingUpgrade.cardId, pendingUpgrade.source, stackId);
      setPendingUpgrade(null);
      setSelectedStackId(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-3 md:p-6 select-none">
      {/* Üst Bar: Tur Bilgisi, Zamanlayıcı, Butonlar */}
      <header className="flex items-center justify-between bg-slate-900/90 border border-slate-700/80 rounded-2xl px-5 py-3 mb-4 shadow-xl">
        <div className="flex items-center gap-4">
          <span className="font-extrabold text-amber-500 text-lg tracking-wider">
            CATAN · ON THE ROAD
          </span>
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-xs text-slate-300">
            <span>Tur #{view.turnNumber}</span>
            <span className="text-slate-600">|</span>
            <span>
              Sıra: <strong className="text-amber-400">{view.players[view.activePlayerId]?.name}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {remainingSeconds !== null && (
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-full text-xs font-semibold text-amber-400">
              <Clock size={14} />
              <span>{remainingSeconds}s</span>
            </div>
          )}

          <button
            onClick={onLeaveGame}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 p-2 rounded-lg bg-slate-800 hover:bg-slate-700/50 transition"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Ayrıl</span>
          </button>
        </div>
      </header>

      {/* Yükseltme Seçim Uyarısı */}
      {pendingUpgrade && (
        <div className="bg-amber-950/80 border-2 border-amber-500 rounded-xl p-3 mb-4 flex items-center justify-between animate-pulse">
          <span className="text-sm text-amber-200">
            Lütfen masanızdan yükseltmek istediğiniz{' '}
            <strong>{pendingUpgrade.type === 'city' ? 'Köyü' : 'Şehri'}</strong> seçin!
          </span>
          <button
            onClick={() => setPendingUpgrade(null)}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg"
          >
            İptal
          </button>
        </div>
      )}

      {/* Oyun Alanı Grid (3 Oyuncu Düzeni) */}
      <div className="flex-1 flex flex-col justify-between gap-4">
        {/* Üst Sıra: 2 Rakip Oyuncu */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opponents.map((pid) => (
            <PlayerDesk
              key={pid}
              playerId={pid}
              view={view}
              isCurrentPlayer={false}
              onInspectCard={onInspectCard}
            />
          ))}
        </div>

        {/* Orta Sıra: Building Row (İnşa Sırası & Kartlar) */}
        <div className="my-auto">
          <BuildingRow
            view={view}
            onInspectCard={onInspectCard}
            onBuildFromRow={handleBuildFromRow}
            onBuildMetropolis={handleBuildMetropolis}
            canBuildCardId={() => isActive}
            canBuildMetropolis={isActive}
          />
        </div>

        {/* Alt Sıra: Aktif Oyuncunun Masası ve Aksiyon Çubuğu */}
        <div className="space-y-3">
          <PlayerDesk
            playerId={view.you}
            view={view}
            isCurrentPlayer={true}
            onInspectCard={onInspectCard}
            onSelectStack={handleConfirmUpgrade}
            selectedStackId={selectedStackId}
            targetUpgradeType={pendingUpgrade?.type}
          />

          {/* Alt Aksiyon Çubuğu */}
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 shadow-xl">
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenTrade}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold rounded-xl text-sm transition shadow-lg"
              >
                <ArrowRightLeft size={16} />
                <span>Ticaret / Takas</span>
                {view.tradeOffers.filter((o) => o.status === 'open').length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {view.tradeOffers.filter((o) => o.status === 'open').length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {isActive ? (
                <button
                  onClick={onEndTurn}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold rounded-xl text-sm transition shadow-lg shadow-emerald-900/40"
                >
                  <CheckCircle2 size={18} />
                  <span>Turu Bitir</span>
                </button>
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Sıradaki oyuncunun hamlesi bekleniyor...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
