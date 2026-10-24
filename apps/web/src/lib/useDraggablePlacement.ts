import { useState, useCallback, useEffect } from 'react';

export interface CardPosition {
  x: number;
  y: number;
}

export interface UseDraggablePlacementOptions {
  storageKey?: string;
  initialPositions?: Record<string, CardPosition>;
}

/**
 * Masadaki kartların serbestçe sürüklenip bırakılmasını (Draggable Placement)
 * ve konumlarının kalıcı olarak saklanmasını sağlayan yardımcı hook.
 */
export function useDraggablePlacement(
  options?: UseDraggablePlacementOptions | Record<string, CardPosition>
) {
  const opts: UseDraggablePlacementOptions =
    options && 'storageKey' in options
      ? options
      : { initialPositions: options as Record<string, CardPosition> | undefined };

  const storageKey = opts.storageKey ?? 'catankard_table_card_positions';

  const [positions, setPositions] = useState<Record<string, CardPosition>>(() => {
    if (typeof window !== 'undefined' && storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        }
      } catch {
        // Hata durumunda varsayılanla devam
      }
    }
    return opts.initialPositions ?? {};
  });

  // Pozisyonlar değiştikçe yerel hafızaya senkronize et
  useEffect(() => {
    if (typeof window !== 'undefined' && storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(positions));
      } catch {
        // ignore storage errors
      }
    }
  }, [positions, storageKey]);

  /** Belirli bir kart yığınının konumunu güncelle */
  const updatePosition = useCallback((id: string, pos: CardPosition) => {
    setPositions((prev) => ({
      ...prev,
      [id]: pos,
    }));
  }, []);

  /** Belirli bir kart yığınının konumunu getir */
  const getPosition = useCallback(
    (id: string): CardPosition => {
      return positions[id] ?? { x: 0, y: 0 };
    },
    [positions]
  );

  /** Tek bir kart yığınının konumunu sıfırla */
  const resetPosition = useCallback((id: string) => {
    setPositions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  /** Tüm kartların masadaki konumlarını sıfırla */
  const resetAllPositions = useCallback(() => {
    setPositions({});
    if (typeof window !== 'undefined' && storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
  }, [storageKey]);

  return {
    positions,
    setPositions,
    updatePosition,
    getPosition,
    resetPosition,
    resetAllPositions,
  };
}

export default useDraggablePlacement;
