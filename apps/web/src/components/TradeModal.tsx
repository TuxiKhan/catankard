import React, { useState, useRef } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import type { PlayerView, Resource, ResourceCounts } from '@catankard/engine';
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

interface TradeCardSlotProps {
  resource: Resource;
  count: number;
  maxAvailable?: number;
  mode: 'give' | 'want';
  onAdd: () => void;
  onSubtract: () => void;
  onReset: () => void;
}

const TradeCardSlot: React.FC<TradeCardSlotProps> = ({
  resource,
  count,
  maxAvailable,
  mode,
  onAdd,
  onSubtract,
  onReset,
}) => {
  const isSelected = count > 0;
  const isGive = mode === 'give';
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef<boolean>(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    longPressFiredRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      try {
        navigator.vibrate?.(40);
      } catch {}
      onReset();
    }, 400);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerStartRef.current && longPressTimerRef.current) {
      const dx = e.clientX - pointerStartRef.current.x;
      const dy = e.clientY - pointerStartRef.current.y;
      if (Math.hypot(dx, dy) > 8) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (longPressFiredRef.current) {
      e.stopPropagation();
      return;
    }
    if (maxAvailable !== undefined && count >= maxAvailable) return;
    onAdd();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onSubtract();
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-[76px] h-[110px] lg:w-[96px] lg:h-[140px] rounded-lg lg:rounded-xl overflow-hidden cursor-pointer select-none transition-all duration-150 ${
        isSelected
          ? isGive
            ? 'ring-4 ring-emerald-400 scale-105 shadow-2xl shadow-emerald-500/30 -translate-y-1'
            : 'ring-4 ring-amber-400 scale-105 shadow-2xl shadow-amber-500/30 -translate-y-1'
          : 'opacity-85 hover:opacity-100 hover:scale-[1.02] border border-white/20'
      }`}
      title={`${RES_NAMES[resource]} - Dokun: +1 | Uzun Bas: Sıfırla | Sağ Tık: -1`}
    >
      <img
        src={getResourceImageUrl(resource)}
        alt={RES_NAMES[resource]}
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* Kartın Üstünde Çarpan Rozeti */}
      {isSelected && (
        <div
          className={`absolute top-2 right-2 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full shadow-xl border-2 animate-in zoom-in-75 ${
            isGive ? 'bg-emerald-500 border-emerald-200' : 'bg-amber-500 border-amber-200'
          }`}
        >
          x{count}
        </div>
      )}

      {/* Eldeki Toplam Stok Bilgisi (Sadece 'give' modunda) */}
      {isGive && maxAvailable !== undefined && (
        <div className="absolute bottom-1.5 inset-x-1.5 bg-black/80 text-emerald-300 text-[10px] font-bold py-0.5 text-center rounded pointer-events-none">
          Eldeki: {maxAvailable}
        </div>
      )}
    </div>
  );
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

  const [toPlayerId, setToPlayerId] = useState<string | null>(
    view.activePlayerId !== view.you ? view.activePlayerId : null
  );
  const [give, setGive] = useState<ResourceCounts>({ brick: 0, wood: 0, wool: 0, wheat: 0, ore: 0 });
  const [want, setWant] = useState<ResourceCounts>({ brick: 0, wood: 0, wool: 0, wheat: 0, ore: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = view.activePlayerId === view.you;
  const otherPlayers = Object.entries(view.players).filter(([id]) => id !== view.you);

  // Sadece elinde olan kaynaklar "Vereceğin" listesinde gösterilir
  const availableResources = RESOURCES.filter((r) => (view.yourHand[r] || 0) > 0);

  const handlePropose = async () => {
    setError(null);
    const giveTotal = Object.values(give).reduce((a, b) => a + b, 0);
    const wantTotal = Object.values(want).reduce((a, b) => a + b, 0);

    if (giveTotal === 0 || wantTotal === 0) {
      setError('En az 1 kaynak verip 1 kaynak istemelisiniz (karşılıksız takas yapılamaz).');
      return;
    }

    for (const r of RESOURCES) {
      if (give[r] > 0 && want[r] > 0) {
        setError(`Aynı kaynak (${RES_NAMES[r]}) hem teklif edilip hem istenemez.`);
        return;
      }
    }

    try {
      setLoading(true);
      const targetId = isActive ? toPlayerId : view.activePlayerId;
      await onProposeTrade(targetId, give, want);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* Şeffaf, hafif cam panel (Ağır dış kutudan ve sarı çift çerçeveden arındırılmış) */}
      <div
        className="relative bg-slate-950/95 border border-white/20 rounded-2xl sm:rounded-3xl max-w-4xl w-full p-3.5 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col max-h-[95dvh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kapat Butonu */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 text-white/50 hover:text-white p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 transition shadow-lg"
          title="Kapat (ESC)"
        >
          <X size={20} />
        </button>

        {/* Başlık */}
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <ArrowRightLeft className="text-amber-400" size={22} />
          <h2 className="text-base sm:text-xl font-black text-white tracking-wide">Ticaret / Takas</h2>
        </div>

        {error && (
          <div className="bg-red-950/80 border border-red-500 text-red-200 text-xs sm:text-sm font-semibold rounded-xl px-4 py-2.5 mb-3 animate-in shake">
            {error}
          </div>
        )}

        {/* Açık Teklifler Bölümü */}
        {openOffers.length > 0 && (
          <div className="mb-5 bg-black/40 border border-white/10 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              Mevcut Açık Teklifler
            </h3>
            <div className="space-y-2">
              {openOffers.map((offer) => {
                const isMine = offer.fromPlayerId === view.you;
                const proposerName = view.players[offer.fromPlayerId]?.name || 'Oyuncu';
                const targetName = offer.toPlayerId ? view.players[offer.toPlayerId]?.name || 'Oyuncu' : 'Herkese';
                const isTargetedToOther = Boolean(offer.toPlayerId && offer.toPlayerId !== view.you);
                const canAccept = !isMine && !isTargetedToOther && (isActive || offer.fromPlayerId === view.activePlayerId);
                const hasEnoughResources = RESOURCES.every((r) => (view.yourHand[r] || 0) >= (offer.want[r] || 0));

                return (
                  <div
                    key={offer.id}
                    className="bg-slate-900/90 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="text-xs text-amber-300 font-bold mb-1">
                        {isMine ? `Senin Teklifin (Kime: ${targetName})` : `${proposerName} Teklifi (Kime: ${offer.toPlayerId === view.you ? 'Sana' : targetName})`}:
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 flex-wrap">
                        <span className="text-emerald-400 font-bold">Verir:</span>
                        {renderResourceCounts(offer.give)}
                        <span className="text-slate-500 mx-1">➔</span>
                        <span className="text-amber-400 font-bold">İster:</span>
                        {renderResourceCounts(offer.want)}
                      </div>
                    </div>

                    {isMine ? (
                      <button
                        onClick={() => onCancelTrade(offer.id)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition shadow"
                      >
                        İptal Et
                      </button>
                    ) : canAccept ? (
                      <button
                        onClick={() => onAcceptTrade(offer.id)}
                        disabled={loading || !hasEnoughResources}
                        title={!hasEnoughResources ? 'Elinizde istenen kaynaklar yok' : 'Teklifi Kabul Et'}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg text-xs font-black transition shadow shadow-emerald-950/60"
                      >
                        {hasEnoughResources ? 'Kabul Et' : 'Kaynak Yetersiz'}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Yeni Teklif Alanı */}
        {!view.turnFlags.traded ? (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 mb-3 sm:mb-5">
              {/* 1. VERECEĞİN (Yalnızca Elindeki Kartlar Gözükür) */}
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Vereceğin (Elinden)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Dokun: +1 | Uzun Bas: Sıfırla
                  </span>
                </div>

                {availableResources.length > 0 ? (
                  <div className="flex flex-wrap gap-2 lg:gap-3 items-center min-h-[120px] lg:min-h-[160px] p-2 rounded-2xl bg-black/30 border border-emerald-900/40">
                    {availableResources.map((r) => (
                      <TradeCardSlot
                        key={`give-${r}`}
                        resource={r}
                        count={give[r] || 0}
                        maxAvailable={view.yourHand[r] || 0}
                        mode="give"
                        onAdd={() => setGive((prev) => ({ ...prev, [r]: (prev[r] || 0) + 1 }))}
                        onSubtract={() => setGive((prev) => ({ ...prev, [r]: Math.max(0, (prev[r] || 0) - 1) }))}
                        onReset={() => setGive((prev) => ({ ...prev, [r]: 0 }))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 lg:p-8 rounded-2xl bg-black/30 border border-emerald-900/30 text-xs text-slate-400">
                    Elinizde takas edebileceğiniz kaynak kartı bulunmuyor.
                  </div>
                )}
              </div>

              {/* 2. İSTEDİĞİN (Tüm 5 Kaynak Kartı Gözükür) */}
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    İstediğin
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Dokun: +1 | Uzun Bas: Sıfırla
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 lg:gap-3 items-center min-h-[120px] lg:min-h-[160px] p-2 rounded-2xl bg-black/30 border border-amber-900/40">
                  {RESOURCES.map((r) => (
                    <TradeCardSlot
                      key={`want-${r}`}
                      resource={r}
                      count={want[r] || 0}
                      mode="want"
                      onAdd={() => setWant((prev) => ({ ...prev, [r]: (prev[r] || 0) + 1 }))}
                      onSubtract={() => setWant((prev) => ({ ...prev, [r]: Math.max(0, (prev[r] || 0) - 1) }))}
                      onReset={() => setWant((prev) => ({ ...prev, [r]: 0 }))}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Hedef Oyuncu Seçimi ve Teklifi İlan Et Butonu */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-300">Kime:</span>
                <select
                  value={isActive ? (toPlayerId ?? '') : view.activePlayerId}
                  onChange={(e) => setToPlayerId(e.target.value ? e.target.value : null)}
                  disabled={!isActive}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 transition disabled:opacity-80"
                >
                  {isActive ? (
                    <>
                      <option value="">Herkese Açık Teklif</option>
                      {otherPlayers.map(([id, p]) => (
                        <option key={id} value={id}>
                          {p.name}
                        </option>
                      ))}
                    </>
                  ) : (
                    <option value={view.activePlayerId}>
                      {view.players[view.activePlayerId]?.name || 'Aktif Oyuncu'} (Sıradaki Oyuncu)
                    </option>
                  )}
                </select>
              </div>

              <button
                onClick={handlePropose}
                disabled={loading}
                className="w-full sm:w-auto px-8 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:from-amber-700 active:to-amber-600 text-slate-950 font-black rounded-xl text-sm transition shadow-xl shadow-amber-950/60 disabled:opacity-50"
              >
                {loading ? 'İletiliyor...' : 'Teklifi İlan Et'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 py-6 text-sm">
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

export default TradeModal;
