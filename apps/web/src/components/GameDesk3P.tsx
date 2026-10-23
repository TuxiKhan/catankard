import React, { useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Crown,
  LogOut,
  Shield,
  Milestone,
} from 'lucide-react';
import type { BuildingCard, MetropolisCard, PlayerView, Resource } from '@catankard/engine';
import { BuildingRowMat } from './BuildingRowMat.tsx';
import { BuildModal } from './BuildModal.tsx';
import { CardStack } from './CardStack.tsx';
import { FannedHand } from './FannedHand.tsx';
import { GameMat } from './GameMat.tsx';

interface GameDesk3PProps {
  view: PlayerView;
  onInspectCard: (type: any, subKind?: any) => void;
  onOpenTrade: () => void;
  onEndTurn: () => Promise<void>;
  onBuild: (
    cardId: string,
    source: 'row' | 'metropolis',
    onStackId?: string,
    substitution?: { replace: Resource; pay: Resource }
  ) => Promise<void>;
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
  const [buildTargetCard, setBuildTargetCard] = useState<{
    card: BuildingCard | MetropolisCard;
    source: 'row' | 'metropolis';
  } | null>(null);

  const [pendingUpgrade, setPendingUpgrade] = useState<{
    cardId: string;
    source: 'row' | 'metropolis';
    type: 'city' | 'metropolis';
    substitution?: { replace: Resource; pay: Resource };
  } | null>(null);

  const [loading, setLoading] = useState(false);

  const isActive = view.activePlayerId === view.you && view.phase === 'action';
  const opponents = view.turnOrder.filter((id) => id !== view.you);
  const oppLeft = opponents[0];
  const oppRight = opponents[1];

  const remainingSeconds = view.turnDeadline
    ? Math.max(0, Math.round((view.turnDeadline - Date.now()) / 1000))
    : null;

  const handleSelectBuild = (card: BuildingCard | MetropolisCard, source: 'row' | 'metropolis') => {
    setBuildTargetCard({ card, source });
  };

  const handleConfirmBuildModal = async (substitution?: { replace: Resource; pay: Resource }) => {
    if (!buildTargetCard) return;
    const { card, source } = buildTargetCard;
    const cardType = source === 'row' ? (card as BuildingCard).type : 'metropolis';

    if (cardType === 'city' || cardType === 'metropolis') {
      setPendingUpgrade({
        cardId: card.id,
        source,
        type: cardType,
        substitution,
      });
      return;
    }

    await onBuild(card.id, source, undefined, substitution);
  };

  const handleConfirmUpgrade = async (stackId: string) => {
    if (!pendingUpgrade) return;
    try {
      setLoading(true);
      await onBuild(
        pendingUpgrade.cardId,
        pendingUpgrade.source,
        stackId,
        pendingUpgrade.substitution
      );
      setPendingUpgrade(null);
      setSelectedStackId(null);
    } finally {
      setLoading(false);
    }
  };

  const youPlayer = view.players[view.you];
  const youArea = youPlayer?.area;
  const youRoadRatio =
    (youArea?.roads ?? 1) <= 1
      ? '4:1'
      : youArea?.roads === 2
      ? '3:1'
      : youArea?.roads === 3
      ? '2:1'
      : '1:1';

  return (
    <div className="relative w-full min-h-screen bg-[#180103] flex flex-col justify-between overflow-hidden">
      {/* 1. ÜST YÜZEN (FLOATING) MINIMAL OYUN BARI */}
      <header className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl bg-slate-950/85 backdrop-blur-md border border-slate-700/60 rounded-2xl px-4 py-2 shadow-2xl flex items-center justify-between transition-all">
        {/* Sol: Tur & Sıra */}
        <div className="flex items-center gap-3">
          <span className="font-black text-amber-500 text-sm tracking-wider uppercase hidden sm:inline">
            Catan On the Road
          </span>
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-full text-xs">
            <span className="text-slate-400">Tur #{view.turnNumber}</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5 font-bold">
              <span
                className={`w-2 h-2 rounded-full ${
                  isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className={isActive ? 'text-emerald-400' : 'text-amber-300'}>
                {view.players[view.activePlayerId]?.name || 'Oyuncu'}
              </span>
            </span>
          </div>
        </div>

        {/* Orta: Skor Tablosu (Puanlar) */}
        <div className="flex items-center gap-2">
          {view.turnOrder.map((pid) => {
            const p = view.players[pid];
            if (!p) return null;
            const isTurn = view.activePlayerId === pid;
            const isMe = view.you === pid;
            const hasRoute = view.longestRouteOwner === pid;
            const hasArmy = view.largestArmyOwner === pid;

            return (
              <div
                key={pid}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs transition-all ${
                  isTurn
                    ? 'border-amber-400/90 bg-amber-950/60 text-amber-200 ring-1 ring-amber-400/40 font-bold'
                    : 'border-slate-800 bg-slate-900/70 text-slate-300'
                }`}
              >
                <span className="truncate max-w-[70px]">
                  {isMe ? 'Sen' : p.name}
                </span>
                <span className="font-black text-yellow-400 bg-black/40 px-1.5 py-0.2 rounded-md">
                  {p.visibleVP} ZP
                </span>
                {hasRoute && <span title="En Uzun Yol (+2 ZP)">🛣️</span>}
                {hasArmy && <span title="En Güçlü Ordu (+2 ZP)">⚔️</span>}
              </div>
            );
          })}
        </div>

        {/* Sağ: Zamanlayıcı & Ayrıl Butonu */}
        <div className="flex items-center gap-2.5">
          {remainingSeconds !== null && (
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                remainingSeconds <= 15
                  ? 'border-red-500 bg-red-950/80 text-red-300 animate-pulse'
                  : 'border-amber-600/50 bg-slate-900 text-amber-400'
              }`}
            >
              <Clock size={13} />
              <span>{remainingSeconds}s</span>
            </div>
          )}

          <button
            onClick={onLeaveGame}
            title="Masadan Ayrıl"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 transition border border-slate-800"
          >
            <LogOut size={15} />
            <span className="hidden md:inline">Ayrıl</span>
          </button>
        </div>
      </header>

      {/* Yükseltme Bildirim Çubuğu */}
      {pendingUpgrade && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-amber-950/95 border-2 border-amber-400 rounded-2xl px-5 py-2.5 shadow-2xl flex items-center gap-4 animate-bounce">
          <span className="text-sm font-bold text-amber-200">
            Masanızdan yükseltmek istediğiniz{' '}
            <strong className="text-white uppercase underline">
              {pendingUpgrade.type === 'city' ? 'Köyü' : 'Şehri'}
            </strong>{' '}
            seçin!
          </span>
          <button
            onClick={() => setPendingUpgrade(null)}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-amber-300 px-3 py-1 rounded-lg border border-amber-600/50 font-bold"
          >
            İptal
          </button>
        </div>
      )}

      {/* 2. OYUN MATI (RED VELVET FELT TABLE) */}
      <GameMat playerCount={3}>
        {/* Üst Alan: 2 Rakip Oyuncu */}
        <div className="w-full flex items-start justify-between gap-4 pt-10">
          {/* Sol Rakip */}
          {oppLeft && (
            <div className="flex flex-col items-start gap-2 relative">
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xs border border-white/10 px-3 py-1.5 rounded-xl shadow-lg">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    view.activePlayerId === oppLeft ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className="font-bold text-xs text-slate-100">
                  {view.players[oppLeft]?.name}
                </span>
                <span className="text-[10px] text-yellow-400 font-extrabold bg-yellow-950/60 px-1.5 py-0.5 rounded border border-yellow-700/50">
                  {view.players[oppLeft]?.visibleVP} ZP
                </span>
                <span className="text-[10px] text-slate-400">
                  🛣️ {view.players[oppLeft]?.area?.roads} | ⚔️ {view.players[oppLeft]?.area?.knights}
                </span>
              </div>

              {/* Sol Rakibin Kart Yelpazesi & Yığınları */}
              <div className="flex items-start gap-4">
                <FannedHand
                  cardCount={view.players[oppLeft]?.handCount ?? 0}
                  isCurrentPlayer={false}
                  corner="top-left"
                  scale={0.9}
                />
                <div className="flex flex-wrap gap-2.5 items-end max-w-sm">
                  {view.players[oppLeft]?.area?.stacks.map((stack) => (
                    <CardStack
                      key={stack.id}
                      stack={stack}
                      onInspectCard={onInspectCard}
                      scale={0.85}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sağ Rakip */}
          {oppRight && (
            <div className="flex flex-col items-end gap-2 relative">
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xs border border-white/10 px-3 py-1.5 rounded-xl shadow-lg">
                <span className="text-[10px] text-slate-400">
                  ⚔️ {view.players[oppRight]?.area?.knights} | 🛣️ {view.players[oppRight]?.area?.roads}
                </span>
                <span className="text-[10px] text-yellow-400 font-extrabold bg-yellow-950/60 px-1.5 py-0.5 rounded border border-yellow-700/50">
                  {view.players[oppRight]?.visibleVP} ZP
                </span>
                <span className="font-bold text-xs text-slate-100">
                  {view.players[oppRight]?.name}
                </span>
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    view.activePlayerId === oppRight ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
              </div>

              <div className="flex items-start gap-4 flex-row-reverse">
                <FannedHand
                  cardCount={view.players[oppRight]?.handCount ?? 0}
                  isCurrentPlayer={false}
                  corner="top-right"
                  scale={0.9}
                />
                <div className="flex flex-wrap gap-2.5 items-end justify-end max-w-sm">
                  {view.players[oppRight]?.area?.stacks.map((stack) => (
                    <CardStack
                      key={stack.id}
                      stack={stack}
                      onInspectCard={onInspectCard}
                      scale={0.85}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Orta Alan: BUILDING ROW MAT */}
        <div className="my-auto flex justify-center w-full">
          <BuildingRowMat
            view={view}
            onInspectCard={onInspectCard}
            onSelectBuild={handleSelectBuild}
            canBuildMetropolis={isActive}
            scale={1.05}
          />
        </div>

        {/* Alt Alan: Kendi Masan (Stacks & Fanned Hand) */}
        <div className="w-full flex flex-col items-center gap-2 pb-14">
          {/* Yerleşim Yığınların (Settlement / City / Metropolis) */}
          <div className="flex items-end justify-center gap-3 flex-wrap">
            {youArea?.stacks.map((stack) => {
              const isSettlement = stack.top === 'settlement';
              const isCity = stack.top === 'city';

              const canSelectForCity = pendingUpgrade?.type === 'city' && isSettlement;
              const canSelectForMetro = pendingUpgrade?.type === 'metropolis' && isCity;
              const isSelectable = Boolean(canSelectForCity || canSelectForMetro);
              const isSelected = selectedStackId === stack.id;

              return (
                <CardStack
                  key={stack.id}
                  stack={stack}
                  isSelectable={isSelectable}
                  isSelected={isSelected}
                  onSelect={handleConfirmUpgrade}
                  onInspectCard={onInspectCard}
                  scale={1.0}
                />
              );
            })}
          </div>

          {/* Oyuncunun Elindeki Fiziksel Kaynak Yelpazesi */}
          <div className="w-full flex justify-center -mt-2">
            <FannedHand
              hand={view.yourHand}
              isCurrentPlayer={true}
              corner="bottom-center"
              onInspectCard={onInspectCard}
              scale={1.1}
            />
          </div>
        </div>
      </GameMat>

      {/* 3. ALT YÜZEN (FLOATING) MINIMAL AKSİYON BARI */}
      <footer className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl bg-slate-950/85 backdrop-blur-md border border-slate-700/60 rounded-2xl px-5 py-2.5 shadow-2xl flex items-center justify-between">
        {/* Sol Aksiyon: Ticaret / Takas & İstatistikler */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenTrade}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-lg border border-amber-400/40"
          >
            <ArrowRightLeft size={15} />
            <span>Ticaret / Takas</span>
            {view.tradeOffers.filter((o) => o.status === 'open').length > 0 && (
              <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {view.tradeOffers.filter((o) => o.status === 'open').length}
              </span>
            )}
          </button>

          {/* Oyuncu Durum Rozetleri */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-300 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1" title="Yol Takas Oranı">
              <Milestone size={13} className="text-amber-400" />
              <span>Yollar ({youArea?.roads}): <strong>{youRoadRatio}</strong></span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1" title="Şövalye Sayısı & Hırsız Koruma Limiti">
              <Shield size={13} className="text-blue-400" />
              <span>Şövalye: <strong>{youArea?.knights}</strong> (+{youArea?.knights} limit)</span>
            </div>
          </div>
        </div>

        {/* Sağ Aksiyon: Turu Bitir */}
        <div className="flex items-center gap-3">
          {isActive ? (
            <button
              onClick={onEndTurn}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black rounded-xl text-sm transition shadow-lg shadow-emerald-950/60 border border-emerald-400/50 animate-pulse"
            >
              <CheckCircle2 size={17} />
              <span>Turu Bitir</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-200/70 italic bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>{view.players[view.activePlayerId]?.name || 'Diğer oyuncu'} oynuyor...</span>
            </div>
          )}
        </div>
      </footer>

      {/* İnşaat Onay Modalı */}
      {buildTargetCard && (
        <BuildModal
          card={buildTargetCard.card}
          source={buildTargetCard.source}
          view={view}
          onClose={() => setBuildTargetCard(null)}
          onConfirm={handleConfirmBuildModal}
        />
      )}
    </div>
  );
};
