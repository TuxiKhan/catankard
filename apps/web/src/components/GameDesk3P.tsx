import React, { useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  LogOut,
} from 'lucide-react';
import type { BuildingCard, MetropolisCard, PlayerView, Resource } from '@catankard/engine';
import { BuildingRowMat } from './BuildingRowMat.tsx';
import { CardStack } from './CardStack.tsx';
import { TableCard } from './TableCard.tsx';
import { FannedHand } from './FannedHand.tsx';
import { GameMat } from './GameMat.tsx';
import { useDraggablePlacement } from '../lib/useDraggablePlacement.ts';
import { createSafeZoneClamper } from '../lib/safePlacementBoundary.ts';

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

  const [pendingUpgrade, setPendingUpgrade] = useState<{
    cardId: string;
    source: 'row' | 'metropolis';
    type: 'city' | 'metropolis';
    substitution?: { replace: Resource; pay: Resource };
  } | null>(null);

  // Masadaki tüm kartların serbestçe sürüklenip bırakılması (Draggable Placement)
  const {
    positions: cardPositions,
    updatePosition: updateCardPosition,
  } = useDraggablePlacement({ storageKey: 'catankard_3p_card_positions' });

  const [, setIsCardDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const isActive = view.activePlayerId === view.you && view.phase === 'action';
  const opponents = view.turnOrder.filter((id) => id !== view.you);
  const oppLeft = opponents[0];
  const oppRight = opponents[1];

  const remainingSeconds = view.turnDeadline
    ? Math.max(0, Math.round((view.turnDeadline - Date.now()) / 1000))
    : null;

  const handleSelectBuild = async (card: BuildingCard | MetropolisCard, source: 'row' | 'metropolis') => {
    if (!isActive) return;
    const cardType = source === 'row' ? (card as BuildingCard).type : 'metropolis';

    if (cardType === 'city' || cardType === 'metropolis') {
      // Doğrudan yükseltme moduna geç (Hiçbir popup veya "İnşa Et" butonu çıkmaz)
      setPendingUpgrade({
        cardId: card.id,
        source,
        type: cardType,
      });
      return;
    }

    // Yol, Şövalye, Köy: Doğrudan inşa et
    try {
      setLoading(true);
      await onBuild(card.id, source);
    } finally {
      setLoading(false);
    }
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

  // Aktif Oyuncunun Bilgileri
  const youPlayer = view.players[view.you];
  const youArea = youPlayer?.area;
  const youRoadsCount = Math.max(1, youArea?.roads ?? 1);
  const youKnightsCount = youArea?.knights ?? 0;
  const youHasRoute = view.longestRouteOwner === view.you;
  const youHasArmy = view.largestArmyOwner === view.you;

  // Rakiplerin Bilgileri
  const oppLeftArea = oppLeft ? view.players[oppLeft]?.area : null;
  const oppLeftRoadsCount = Math.max(1, oppLeftArea?.roads ?? 1);
  const oppLeftKnightsCount = oppLeftArea?.knights ?? 0;
  const oppLeftHasRoute = oppLeft ? view.longestRouteOwner === oppLeft : false;
  const oppLeftHasArmy = oppLeft ? view.largestArmyOwner === oppLeft : false;

  const oppRightArea = oppRight ? view.players[oppRight]?.area : null;
  const oppRightRoadsCount = Math.max(1, oppRightArea?.roads ?? 1);
  const oppRightKnightsCount = oppRightArea?.knights ?? 0;
  const oppRightHasRoute = oppRight ? view.longestRouteOwner === oppRight : false;
  const oppRightHasArmy = oppRight ? view.largestArmyOwner === oppRight : false;

  // Toplam masa kartı sayısı (konumlandırma ve clamping hesapları için)
  const totalYouCards =
    (youArea?.stacks.length ?? 1) +
    youRoadsCount +
    youKnightsCount +
    (youHasRoute ? 1 : 0) +
    (youHasArmy ? 1 : 0);

  return (
    <div className="relative w-full min-h-screen bg-[#180103] flex flex-col justify-between overflow-hidden">
      {/* 1. ÜST YÜZEN MINIMAL OYUN BARI */}
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
                  isActive ? 'bg-sky-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className={isActive ? 'text-sky-300' : 'text-amber-300'}>
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
                    ? 'border-sky-400/90 bg-sky-950/80 text-sky-200 ring-2 ring-sky-400/50 shadow-[0_0_15px_rgba(56,189,248,0.5)] font-bold'
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
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-sky-950/95 border border-sky-400/80 rounded-xl px-4 py-1.5 shadow-2xl flex items-center gap-3 animate-in fade-in">
          <span className="text-xs font-bold text-sky-200">
            {pendingUpgrade.type === 'city' ? 'Köy' : 'Şehir'} seçin
          </span>
          <button
            onClick={() => setPendingUpgrade(null)}
            className="text-xs bg-black/50 hover:bg-black text-slate-300 px-2 py-0.5 rounded border border-white/20 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. OYUN MATI (RED VELVET FELT TABLE) */}
      <GameMat playerCount={3}>
        {/* Üst Alan: 2 Rakip Oyuncu */}
        <div className="w-full flex items-start justify-between gap-4 pt-10">
          {/* Sol Rakip (oppLeft) */}
          {oppLeft && (
            <div
              className={`flex flex-col items-start gap-1.5 relative rounded-2xl p-2 transition-all duration-300 ${
                view.activePlayerId === oppLeft
                  ? 'ring-2 ring-sky-400/80 shadow-[0_0_25px_rgba(56,189,248,0.4)] bg-sky-950/20'
                  : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Sol Rakip Eli & İsim Etiketi */}
                <div className="flex flex-col items-start">
                  <FannedHand
                    cardCount={view.players[oppLeft]?.handCount ?? 0}
                    isCurrentPlayer={false}
                    corner="top-left"
                    scale={0.85}
                  />
                  <div
                    className={`mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
                      view.activePlayerId === oppLeft
                        ? 'bg-sky-950/90 text-sky-200 border border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.6)] animate-pulse'
                        : 'bg-black/50 text-slate-200 border border-white/10'
                    }`}
                  >
                    <span>{view.players[oppLeft]?.name}</span>
                    <span className="text-yellow-400 font-black">
                      {view.players[oppLeft]?.visibleVP} ZP
                    </span>
                  </div>
                </div>

                {/* Sol Rakibin Masadaki Fiziksel Kartları (Köy, Yol, Şövalye, Bonus) */}
                <div className="flex flex-wrap gap-2 items-end max-w-md pt-1">
                  {/* Settlement Stacks */}
                  {oppLeftArea?.stacks.map((stack) => (
                    <CardStack
                      key={stack.id}
                      stack={stack}
                      onInspectCard={onInspectCard}
                      scale={0.78}
                      baseWidth={125}
                      baseHeight={186}
                    />
                  ))}

                  {/* Road Cards (1 Başlangıç Yolu + İnşa Edilen Yollar) */}
                  {Array.from({ length: oppLeftRoadsCount }).map((_, i) => (
                    <TableCard
                      key={`${oppLeft}-road-${i}`}
                      id={`${oppLeft}-road-${i}`}
                      type="road"
                      isStarting={i === 0}
                      scale={0.78}
                      baseWidth={125}
                      baseHeight={186}
                      onInspect={() => onInspectCard('road')}
                    />
                  ))}

                  {/* Knight Cards */}
                  {Array.from({ length: oppLeftKnightsCount }).map((_, i) => (
                    <TableCard
                      key={`${oppLeft}-knight-${i}`}
                      id={`${oppLeft}-knight-${i}`}
                      type="knight"
                      scale={0.78}
                      baseWidth={125}
                      baseHeight={186}
                      onInspect={() => onInspectCard('knight')}
                    />
                  ))}

                  {/* Bonus Kartlar */}
                  {oppLeftHasRoute && (
                    <TableCard
                      key={`${oppLeft}-bonus-longest-route`}
                      id={`${oppLeft}-bonus-longest-route`}
                      type="longest_route"
                      scale={0.78}
                      baseWidth={125}
                      baseHeight={186}
                      onInspect={() => onInspectCard('longest_route')}
                    />
                  )}
                  {oppLeftHasArmy && (
                    <TableCard
                      key={`${oppLeft}-bonus-largest-army`}
                      id={`${oppLeft}-bonus-largest-army`}
                      type="largest_army"
                      scale={0.78}
                      baseWidth={125}
                      baseHeight={186}
                      onInspect={() => onInspectCard('largest_army')}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sağ Rakip (oppRight) */}
          {oppRight && (
            <div
              className={`flex flex-col items-end gap-1.5 relative rounded-2xl p-2 transition-all duration-300 ${
                view.activePlayerId === oppRight
                  ? 'ring-2 ring-sky-400/80 shadow-[0_0_25px_rgba(56,189,248,0.4)] bg-sky-950/20'
                  : ''
              }`}
            >
              <div className="flex items-start gap-3 flex-row-reverse">
                {/* Sağ Rakip Eli & İsim Etiketi */}
                <div className="flex flex-col items-end">
                  <FannedHand
                    cardCount={view.players[oppRight]?.handCount ?? 0}
                    isCurrentPlayer={false}
                    corner="top-right"
                    scale={0.85}
                  />
                  <div
                    className={`mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
                      view.activePlayerId === oppRight
                        ? 'bg-sky-950/90 text-sky-200 border border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.6)] animate-pulse'
                        : 'bg-black/50 text-slate-200 border border-white/10'
                    }`}
                  >
                    <span>{view.players[oppRight]?.name}</span>
                    <span className="text-yellow-400 font-black">
                      {view.players[oppRight]?.visibleVP} ZP
                    </span>
                  </div>
                </div>

                {/* Sağ Rakibin Masadaki Fiziksel Kartları (Köy, Yol, Şövalye, Bonus) */}
                <div className="flex flex-wrap gap-2 items-end justify-end max-w-md pt-1">
                  {/* Settlement Stacks */}
                  {oppRightArea?.stacks.map((stack) => (
                    <CardStack
                      key={stack.id}
                      stack={stack}
                      onInspectCard={onInspectCard}
                      scale={0.78}
                      baseWidth={125}
                      baseHeight={186}
                    />
                  ))}

                  {/* Road Cards */}
                  {Array.from({ length: oppRightRoadsCount }).map((_, i) => (
                    <TableCard
                      key={`${oppRight}-road-${i}`}
                      id={`${oppRight}-road-${i}`}
                      type="road"
                      isStarting={i === 0}
                      scale={0.78}
                      baseWidth={125}
                      baseHeight={186}
                      onInspect={() => onInspectCard('road')}
                    />
                  ))}

                  {/* Knight Cards */}
                  {Array.from({ length: oppRightKnightsCount }).map((_, i) => (
                    <TableCard
                      key={`${oppRight}-knight-${i}`}
                      id={`${oppRight}-knight-${i}`}
                      type="knight"
                      scale={0.78}
                      baseWidth={125}
                      baseHeight={186}
                      onInspect={() => onInspectCard('knight')}
                    />
                  ))}

                  {/* Bonus Kartlar */}
                  {oppRightHasRoute && (
                    <TableCard
                      key={`${oppRight}-bonus-longest-route`}
                      id={`${oppRight}-bonus-longest-route`}
                      type="longest_route"
                      scale={0.78}
                      baseWidth={125}
                      baseHeight={186}
                      onInspect={() => onInspectCard('longest_route')}
                    />
                  )}
                  {oppRightHasArmy && (
                    <TableCard
                      key={`${oppRight}-bonus-largest-army`}
                      id={`${oppRight}-bonus-largest-army`}
                      type="largest_army"
                      scale={0.78}
                      baseWidth={125}
                      baseHeight={186}
                      onInspect={() => onInspectCard('largest_army')}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Orta Alan: BUILDING ROW MAT */}
        <div className="my-auto flex justify-center w-full z-10">
          <BuildingRowMat
            view={view}
            onInspectCard={onInspectCard}
            onSelectBuild={handleSelectBuild}
            canBuildMetropolis={isActive}
            scale={1.05}
          />
        </div>

        {/* Alt Alan: Kendi Masan (Table Cards & Bottom Hand) */}
        <div
          className={`w-full flex flex-col items-center justify-end relative rounded-2xl p-2 transition-all duration-300 pb-1 ${
            isActive
              ? 'ring-2 ring-sky-400/80 shadow-[0_0_35px_rgba(56,189,248,0.35)] bg-sky-950/15'
              : ''
          }`}
        >
          {/* 1. Masadaki Fiziksel Kartlar (Settlement/City stacks, Road cards, Knight cards, Bonus cards) */}
          <div className="w-full flex items-end justify-center gap-3 sm:gap-4 flex-wrap mb-4 z-20">
            {/* Settlement Stacks (Köy -> Şehir -> Büyükşehir) */}
            {youArea?.stacks.map((stack, index) => {
              const isSettlement = stack.top === 'settlement';
              const isCity = stack.top === 'city';

              const canSelectForCity = pendingUpgrade?.type === 'city' && isSettlement;
              const canSelectForMetro = pendingUpgrade?.type === 'metropolis' && isCity;
              const isSelectable = Boolean(canSelectForCity || canSelectForMetro);
              const isSelected = selectedStackId === stack.id;

              const clampFn = createSafeZoneClamper({
                layout: '3P',
                handPosition: 'bottom-center',
                slotIndex: index,
                totalSlots: totalYouCards,
                cardWidth: 125,
              });

              return (
                <CardStack
                  key={stack.id}
                  stack={stack}
                  isSelectable={isSelectable}
                  isSelected={isSelected}
                  onSelect={handleConfirmUpgrade}
                  onInspectCard={onInspectCard}
                  scale={1.0}
                  baseWidth={125}
                  baseHeight={186}
                  isDraggable={true}
                  position={cardPositions[stack.id]}
                  onPositionChange={(pos) => updateCardPosition(stack.id, pos)}
                  onDragChange={setIsCardDragging}
                  clampPosition={clampFn}
                />
              );
            })}

            {/* Road Cards (1 Başlangıç Yolu + İnşa Edilen Yollar) */}
            {Array.from({ length: youRoadsCount }).map((_, i) => {
              const cardId = `you-road-${i}`;
              const slotIdx = (youArea?.stacks.length ?? 1) + i;
              const clampFn = createSafeZoneClamper({
                layout: '3P',
                handPosition: 'bottom-center',
                slotIndex: slotIdx,
                totalSlots: totalYouCards,
                cardWidth: 125,
              });

              return (
                <TableCard
                  key={cardId}
                  id={cardId}
                  type="road"
                  isStarting={i === 0}
                  scale={1.0}
                  baseWidth={125}
                  baseHeight={186}
                  isDraggable={true}
                  position={cardPositions[cardId]}
                  onPositionChange={(pos) => updateCardPosition(cardId, pos)}
                  onDragChange={setIsCardDragging}
                  clampPosition={clampFn}
                  onInspect={() => onInspectCard('road')}
                />
              );
            })}

            {/* Knight Cards (İnşa Edilen Şövalyeler) */}
            {Array.from({ length: youKnightsCount }).map((_, i) => {
              const cardId = `you-knight-${i}`;
              const slotIdx = (youArea?.stacks.length ?? 1) + youRoadsCount + i;
              const clampFn = createSafeZoneClamper({
                layout: '3P',
                handPosition: 'bottom-center',
                slotIndex: slotIdx,
                totalSlots: totalYouCards,
                cardWidth: 125,
              });

              return (
                <TableCard
                  key={cardId}
                  id={cardId}
                  type="knight"
                  scale={1.0}
                  baseWidth={125}
                  baseHeight={186}
                  isDraggable={true}
                  position={cardPositions[cardId]}
                  onPositionChange={(pos) => updateCardPosition(cardId, pos)}
                  onDragChange={setIsCardDragging}
                  clampPosition={clampFn}
                  onInspect={() => onInspectCard('knight')}
                />
              );
            })}

            {/* Bonus Kartlar (En Uzun Yol & En Güçlü Ordu) */}
            {youHasRoute && (
              <TableCard
                key="bonus-longest-route"
                id="bonus-longest-route"
                type="longest_route"
                scale={1.0}
                baseWidth={125}
                baseHeight={186}
                isDraggable={true}
                position={cardPositions['bonus-longest-route']}
                onPositionChange={(pos) => updateCardPosition('bonus-longest-route', pos)}
                onDragChange={setIsCardDragging}
                clampPosition={createSafeZoneClamper({
                  layout: '3P',
                  handPosition: 'bottom-center',
                  slotIndex: totalYouCards - 1,
                  totalSlots: totalYouCards,
                  cardWidth: 125,
                })}
                onInspect={() => onInspectCard('longest_route')}
              />
            )}
            {youHasArmy && (
              <TableCard
                key="bonus-largest-army"
                id="bonus-largest-army"
                type="largest_army"
                scale={1.0}
                baseWidth={125}
                baseHeight={186}
                isDraggable={true}
                position={cardPositions['bonus-largest-army']}
                onPositionChange={(pos) => updateCardPosition('bonus-largest-army', pos)}
                onDragChange={setIsCardDragging}
                clampPosition={createSafeZoneClamper({
                  layout: '3P',
                  handPosition: 'bottom-center',
                  slotIndex: totalYouCards - 1,
                  totalSlots: totalYouCards,
                  cardWidth: 125,
                })}
                onInspect={() => onInspectCard('largest_army')}
              />
            )}
          </div>

          {/* 2. Oyuncunun Elindeki Fiziksel Kaynak Yelpazesi & Altında Sadece [İsim] [ZP] */}
          <div className="w-full flex flex-col items-center z-10">
            <FannedHand
              hand={view.yourHand}
              isCurrentPlayer={true}
              corner="bottom-center"
              onInspectCard={onInspectCard}
              scale={1.05}
            />
            <div
              className={`mt-1 flex items-center gap-1.5 px-3 py-0.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-sky-950/90 text-sky-200 border border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.6)] animate-pulse'
                  : 'bg-black/50 text-slate-200 border border-white/10'
              }`}
            >
              <span>{youPlayer?.name || 'Sen'}</span>
              <span className="text-yellow-400 font-black">
                {youPlayer?.visibleVP} ZP
              </span>
            </div>
          </div>
        </div>
      </GameMat>

      {/* 3. ALT YÜZEN MINIMAL AKSİYON BARI */}
      <footer className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl bg-slate-950/85 backdrop-blur-md border border-slate-700/60 rounded-2xl px-5 py-2.5 shadow-2xl flex items-center justify-between">
        {/* Sol Aksiyon: Ticaret / Takas */}
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
            <div className="flex items-center gap-2 text-xs text-sky-200/80 italic bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
              <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>{view.players[view.activePlayerId]?.name || 'Diğer oyuncu'} oynuyor...</span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default GameDesk3P;
