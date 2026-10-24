import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { SettlementStack } from '@catankard/engine';
import { Ban, RotateCcw, ShieldCheck } from 'lucide-react';
import { CardStack } from './CardStack.tsx';

export interface SafePlacementZoneProps {
  /** Masada duran yerleşim yığınları (Köy, Şehir, Büyükşehir) */
  stacks: SettlementStack[];
  /** Aktif oyuncu mu? */
  isCurrentPlayer: boolean;
  /** Seçili yığın ID'si */
  selectedStackId?: string | null;
  /** Devam eden yükseltme seçimi (Köy -> Şehir, Şehir -> Büyükşehir) */
  pendingUpgrade?: {
    type: 'city' | 'metropolis';
  } | null;
  /** Yükseltme hedefi seçildiğinde çağrılır */
  onSelectUpgrade?: (stackId: string) => void | Promise<void>;
  /** Kart inceleme modalını açar */
  onInspectCard: (type: any, subKind?: any) => void;
  /** Kart boyutu ölçeği (varsayılan: 1.0) */
  scale?: number;
  /** Masa yerleşim modu */
  layoutMode?: '3P' | '4P';
  /** El kartlarının konumu */
  handPosition?: 'bottom-center' | 'bottom-right';
  /** Ek Tailwind sınıfları */
  className?: string;
}

interface CardCoord {
  x: number;
  bottom: number;
}

export const SafePlacementZone: React.FC<SafePlacementZoneProps> = ({
  stacks,
  isCurrentPlayer,
  selectedStackId,
  pendingUpgrade,
  onSelectUpgrade,
  onInspectCard,
  scale = 1.0,
  layoutMode = '3P',
  handPosition = 'bottom-center',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Kullanıcı tarafından sürüklenip bırakılan özel kart konumları
  const [customPositions, setCustomPositions] = useState<Record<string, CardCoord>>({});

  // Sürükleme durumu
  const [dragState, setDragState] = useState<{
    stackId: string;
    startPointerX: number;
    startPointerY: number;
    startCardX: number;
    startCardBottom: number;
    currentX: number;
    currentBottom: number;
    isDragging: boolean;
  } | null>(null);

  const draggedRecentlyRef = useRef(false);

  // Kart boyutları
  const cardW = Math.round(90 * scale);
  const cardH = Math.round(130 * scale);

  // Yasak Bölge (Hand Zone) Yüksekliği: Ekranın altından itibaren ~220px
  const HAND_ZONE_HEIGHT = 222;
  // Güvenli Bölge alt sınırı (kartların oturacağı minimum yükseklik)
  const SAFE_ZONE_MIN_BOTTOM = 228;

  // Konteyner boyutunu izle
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };

    updateSize();

    const ro = new ResizeObserver(() => updateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Yasak El Bölgesinin (Hand Zone) yatay sınırlarını hesapla
  const getHandZoneBounds = useCallback(() => {
    const W = containerSize.width || 800;

    if (handPosition === 'bottom-right') {
      const handW = Math.min(W * 0.7, 440);
      return {
        left: Math.max(0, W - handW - 16),
        right: W,
        width: handW,
      };
    }

    // bottom-center (3P varsayılanı)
    const handW = Math.min(W * 0.85, 520);
    return {
      left: Math.max(0, (W - handW) / 2),
      right: Math.min(W, (W + handW) / 2),
      width: handW,
    };
  }, [containerSize.width, handPosition]);

  // Güvenli bölgeye yaslama / sınırlandırma (Boundary Clamping & Forbidden Zone Collision)
  const clampToSafeZone = useCallback(
    (targetX: number, targetBottom: number): CardCoord => {
      const W = containerSize.width || 800;
      const H = containerSize.height || 400;
      const handBounds = getHandZoneBounds();

      // 1. Dış konteyner sınırları (yatayda sağa sola taşmayı engelle)
      const clampedX = Math.max(12, Math.min(targetX, W - cardW - 12));

      // 2. Kartın yatay eksende El Bölgesi (Hand Zone) ile çakışıp çakışmadığını denetle
      const cardRight = clampedX + cardW;
      const intersectsHandX = cardRight > handBounds.left + 8 && clampedX < handBounds.right - 8;

      let clampedBottom = targetBottom;

      if (intersectsHandX) {
        // Kart el kartlarının kapladığı yasak bölgeye (alt ~220px) taşınırsa,
        // otomatik olarak güvenli bölge sınırına (SAFE_ZONE_MIN_BOTTOM) yaslanmalı!
        clampedBottom = Math.max(SAFE_ZONE_MIN_BOTTOM, targetBottom);
      } else {
        // El bölgesinin sağında veya solunda kalan serbest masa alanında
        // kartların en alta düşmesini engelleyen emniyet payı (footer üstü)
        clampedBottom = Math.max(64, targetBottom);
      }

      // Üst sınır (BuildingRowMat ve masa tepesine taşmayı engelle)
      const maxBottom = Math.max(SAFE_ZONE_MIN_BOTTOM, H - cardH - 16);
      clampedBottom = Math.min(clampedBottom, maxBottom);

      return {
        x: clampedX,
        bottom: clampedBottom,
      };
    },
    [containerSize.width, containerSize.height, cardW, cardH, getHandZoneBounds]
  );

  // Varsayılan kavisli/sıralı başlangıç pozisyonu
  const getDefaultPosition = useCallback(
    (index: number, total: number): CardCoord => {
      const W = containerSize.width || 800;
      const handBounds = getHandZoneBounds();

      if (layoutMode === '4P' && handPosition === 'bottom-right') {
        // 4 Oyunculu sağ alt kadran: el sağda olduğu için kartlar hafif sola/ortaya ve elin üstüne dizilir
        const spacing = Math.min(cardW + 16, Math.max(70, (W - 40) / Math.max(1, total)));
        const totalW = (total - 1) * spacing + cardW;
        const startX = Math.max(16, (W - totalW) / 2);
        const mid = (total - 1) / 2;
        const arcY = -Math.abs(index - mid) * 5;

        return clampToSafeZone(startX + index * spacing, SAFE_ZONE_MIN_BOTTOM + 8 + arcY);
      }

      // 3 Oyunculu mod: Kartlar el bölgesinin hemen üstünde zarif bir kavisle ortalanır
      const spacing = Math.min(cardW + 20, Math.max(76, (W - 60) / Math.max(1, total)));
      const totalW = (total - 1) * spacing + cardW;
      const startX = Math.max(16, (W - totalW) / 2);
      const mid = (total - 1) / 2;
      // Ortada olan kartlar tam güvenli sınırda, kenardakiler hafifçe yukarı kavis alır
      const arcY = -Math.abs(index - mid) * 6;

      const rawX = startX + index * spacing;
      const rawBottom = SAFE_ZONE_MIN_BOTTOM + 6 + arcY;

      return clampToSafeZone(rawX, rawBottom);
    },
    [containerSize.width, cardW, layoutMode, handPosition, clampToSafeZone, getHandZoneBounds]
  );

  // Sürükleme başlangıcı (PointerDown)
  const handlePointerDown = (e: React.PointerEvent, stackId: string) => {
    // Yalnızca birincil fare/dokunma düğmesi
    if (e.button !== 0) return;

    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    // Kartın geçerli koordinatlarını al
    const currentCoord =
      customPositions[stackId] ??
      getDefaultPosition(
        stacks.findIndex((s) => s.id === stackId),
        stacks.length
      );

    setDragState({
      stackId,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startCardX: currentCoord.x,
      startCardBottom: currentCoord.bottom,
      currentX: currentCoord.x,
      currentBottom: currentCoord.bottom,
      isDragging: false,
    });
  };

  // Sürükleme hareketi (PointerMove)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;

    const dx = e.clientX - dragState.startPointerX;
    // clientY aşağı indikçe artar; bottom aşağı indikçe azalır
    const dy = e.clientY - dragState.startPointerY;

    const distance = Math.hypot(dx, dy);
    const isNowDragging = dragState.isDragging || distance >= 5;

    const targetX = dragState.startCardX + dx;
    const targetBottom = dragState.startCardBottom - dy;

    const clamped = clampToSafeZone(targetX, targetBottom);

    setDragState({
      ...dragState,
      currentX: clamped.x,
      currentBottom: clamped.bottom,
      isDragging: isNowDragging,
    });
  };

  // Sürükleme sonlandırma (PointerUp)
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState) return;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (dragState.isDragging) {
      // Sürükleme tamamlandı: nihai güvenli koordinatı kaydet
      setCustomPositions((prev) => ({
        ...prev,
        [dragState.stackId]: {
          x: dragState.currentX,
          bottom: dragState.currentBottom,
        },
      }));

      // Tıklama olayının tetiklenmesini kısa süreliğine engelle
      draggedRecentlyRef.current = true;
      setTimeout(() => {
        draggedRecentlyRef.current = false;
      }, 120);
    }

    setDragState(null);
  };

  // Pozisyonları varsayılana sıfırla
  const handleResetPositions = () => {
    setCustomPositions({});
  };

  const handBounds = getHandZoneBounds();
  const isCurrentlyDragging = Boolean(dragState?.isDragging);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[360px] sm:h-[390px] select-none touch-none overflow-hidden ${className}`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* ============================================================== */}
      {/* 1. GÖRSEL KILAVUZ & YASAK BÖLGE GÖSTERGELERİ                     */}
      {/* ============================================================== */}

      {/* Yasak Bölge (Hand Zone): Kart taşınırken kullanıcıya görsel uyarı */}
      <div
        style={{
          left: `${handBounds.left}px`,
          width: `${handBounds.width}px`,
          height: `${HAND_ZONE_HEIGHT}px`,
          bottom: 0,
        }}
        className={`absolute rounded-2xl border-2 border-dashed transition-all duration-300 pointer-events-none flex flex-col items-center justify-start pt-3 z-0 ${
          isCurrentlyDragging
            ? 'border-red-500/70 bg-red-950/30 backdrop-blur-xs opacity-100 ring-2 ring-red-500/30'
            : 'border-transparent bg-transparent opacity-0'
        }`}
      >
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/90 border border-red-500/60 shadow-lg text-red-200 text-xs font-bold animate-pulse">
          <Ban size={14} className="text-red-400" />
          <span>Yasak Bölge (El Kartları) • Buraya Kart Konamaz</span>
        </div>
        <span className="text-[10px] text-red-300/70 mt-1">
          Kartlar elinizin üstündeki güvenli masa alanına yerleşir
        </span>
      </div>

      {/* Güvenli Bölge Ayrım Çizgisi (Safe Placement Boundary Line) */}
      <div
        style={{ bottom: `${SAFE_ZONE_MIN_BOTTOM}px` }}
        className={`absolute inset-x-4 border-t-2 border-dashed transition-all duration-300 pointer-events-none flex items-center justify-between z-0 ${
          isCurrentlyDragging
            ? 'border-amber-400/60 opacity-100'
            : 'border-white/5 opacity-40'
        }`}
      >
        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-amber-500/30 text-[10px] text-amber-300/80 -translate-y-1/2">
          <ShieldCheck size={12} className="text-emerald-400" />
          <span>Güvenli Masa Alanı (Serbest Yerleşim)</span>
        </div>

        {Object.keys(customPositions).length > 0 && (
          <button
            type="button"
            onClick={handleResetPositions}
            title="Kartları varsayılan kavisli sıraya diz"
            className="pointer-events-auto -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-amber-300 border border-amber-600/40 text-[10px] shadow transition"
          >
            <RotateCcw size={10} />
            <span>Düzeni Sıfırla</span>
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. SÜRÜKLENEBİLİR YERLEŞİM YIĞINLARI (CARD STACKS)              */}
      {/* ============================================================== */}
      {stacks.length === 0 ? (
        <div
          style={{ bottom: `${SAFE_ZONE_MIN_BOTTOM + 20}px` }}
          className="absolute inset-x-0 flex justify-center pointer-events-none"
        >
          <div className="text-xs text-amber-200/50 italic px-4 py-2 bg-black/30 rounded-xl border border-dashed border-amber-800/40">
            Henüz yerleşim kurulmadı
          </div>
        </div>
      ) : (
        stacks.map((stack, index) => {
          const isSettlement = stack.top === 'settlement';
          const isCity = stack.top === 'city';

          const canSelectForCity = pendingUpgrade?.type === 'city' && isSettlement && isCurrentPlayer;
          const canSelectForMetro = pendingUpgrade?.type === 'metropolis' && isCity && isCurrentPlayer;
          const isSelectable = Boolean(canSelectForCity || canSelectForMetro);
          const isSelected = selectedStackId === stack.id;

          const isThisBeingDragged = dragState?.stackId === stack.id;

          // Koordinatları belirle (sürükleniyorsa canlı koordinat, değilse özel veya varsayılan)
          const coord = isThisBeingDragged
            ? { x: dragState.currentX, bottom: dragState.currentBottom }
            : (customPositions[stack.id] ?? getDefaultPosition(index, stacks.length));

          return (
            <div
              key={stack.id}
              style={{
                position: 'absolute',
                left: `${coord.x}px`,
                bottom: `${coord.bottom}px`,
                zIndex: isThisBeingDragged ? 45 : isSelected ? 30 : 20 + index,
                transition: isThisBeingDragged
                  ? 'none'
                  : 'left 0.2s cubic-bezier(0.2, 0, 0, 1), bottom 0.2s cubic-bezier(0.2, 0, 0, 1), transform 0.15s ease',
              }}
              className={`cursor-grab active:cursor-grabbing select-none group touch-none ${
                isThisBeingDragged
                  ? 'scale-105 shadow-2xl ring-2 ring-amber-400 rounded-2xl shadow-amber-500/30'
                  : ''
              }`}
              onPointerDown={(e) => handlePointerDown(e, stack.id)}
              onClickCapture={(e) => {
                // Eğer kart az önce sürüklendiyse yükseltme/inceleme modalını tetikleme
                if (draggedRecentlyRef.current) {
                  e.stopPropagation();
                  e.preventDefault();
                }
              }}
            >
              <CardStack
                stack={stack}
                isSelectable={isSelectable}
                isSelected={isSelected}
                onSelect={onSelectUpgrade}
                onInspectCard={onInspectCard}
                scale={scale}
              />
            </div>
          );
        })
      )}
    </div>
  );
};

export default SafePlacementZone;