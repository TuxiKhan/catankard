import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from './supabase.ts';

export interface CardPosition {
  x: number;
  y: number;
}

export interface CardMovePayload {
  playerId: string;
  cardId: string;
  pos: CardPosition;
  timestamp?: number;
}

export const CARD_BOUNDS = {
  MIN_X: -140,
  MAX_X: 100,
  MIN_Y: -80,
  MAX_Y: 50,
} as const;

/**
 * Kart koordinatlarını güvenli sınırlar içinde tutar (-120 <= x <= 120, -100 <= y <= 50).
 * Aşırı veya bozuk koordinatların istemciler arasında yayılmasını ve saklanmasını önler.
 */
export function sanitizeCardPosition(pos: CardPosition | null | undefined): CardPosition {
  if (!pos || typeof pos !== 'object') {
    return { x: 0, y: 0 };
  }
  const rawX = Number(pos.x);
  const rawY = Number(pos.y);
  const safeX = Number.isFinite(rawX) ? rawX : 0;
  const safeY = Number.isFinite(rawY) ? rawY : 0;
  return {
    x: Math.max(CARD_BOUNDS.MIN_X, Math.min(CARD_BOUNDS.MAX_X, Math.round(safeX))),
    y: Math.max(CARD_BOUNDS.MIN_Y, Math.min(CARD_BOUNDS.MAX_Y, Math.round(safeY))),
  };
}

export interface UseRealtimeCardPositionsOptions {
  /** Oda kimliği (Realtime kanalı için) */
  roomId?: string | null;
  /** Aktif / oturumdaki oyuncu kimliği */
  playerId?: string;
  /** Ana localStorage saklama anahtarı */
  storageKey?: string;
  /** Geriye dönük uyumluluk için eski localStorage anahtarı (örn: catankard_4p_card_positions) */
  legacyStorageKey?: string;
  /** Aktif oyuncu için başlangıç pozisyonları */
  initialPositions?: Record<string, CardPosition>;
  /** Tüm oyuncular için başlangıç pozisyonları */
  initialPositionsByPlayer?: Record<string, Record<string, CardPosition>>;
  /** Sürükleme esnasında canlı yayın throttle süresi (ms, varsayılan: 60) */
  throttleMs?: number;
  /** Testler ve mock'lar için harici Supabase veya kanal enjeksiyonu */
  customChannel?: any;
}

export interface UseRealtimeCardPositionsReturn {
  /** Tüm oyuncuların kart pozisyon haritası: [playerId -> [cardId -> CardPosition]] */
  positionsByPlayer: Record<string, Record<string, CardPosition>>;
  /** Aktif oyuncunun kendi kart pozisyonları: [cardId -> CardPosition] */
  positions: Record<string, CardPosition>;
  /** Kendi kartının konumunu kaydet ve tüm oyunculara anında canlı broadcast et */
  updatePosition: (cardId: string, pos: CardPosition) => void;
  /** Sürükleme esnasında diğer oyunculara throttled akıcı konum yayını yap */
  broadcastCardPosition: (cardId: string, pos: CardPosition) => void;
  /** Kendi kartının veya hedef oyuncunun kartının koordinatını getir */
  getPosition: (cardId: string, targetPlayerId?: string) => CardPosition;
  /** Hedef oyuncunun belirli bir kartının koordinatını güvenli alias çözümlemesiyle getir */
  getPlayerCardPosition: (targetPlayerId: string, cardId: string) => CardPosition;
  /** Tek bir kartın konumunu sıfırla */
  resetPosition: (cardId: string, targetPlayerId?: string) => void;
  /** Tüm kartların masadaki konumlarını sıfırla */
  resetAllPositions: () => void;
  /** Pozisyon state'ini doğrudan güncelleme fonksiyonu */
  setPositionsByPlayer: React.Dispatch<React.SetStateAction<Record<string, Record<string, CardPosition>>>>;
}

/**
 * Kart ID'leri arasındaki alias çözümlemesi
 * (Örn: `p1-road-0` <-> `you-4p-road-0` <-> `you-3p-road-0` <-> `my-road-0` <-> `road-0`)
 */
export function getAliasesForCardId(playerId: string, cardId: string): string[] {
  const aliases = new Set<string>([cardId]);

  // Road kartları
  const roadMatch = cardId.match(/road-(\d+)/);
  if (roadMatch) {
    const idx = roadMatch[1];
    aliases.add(`road-${idx}`);
    aliases.add(`${playerId}-road-${idx}`);
    aliases.add(`you-4p-road-${idx}`);
    aliases.add(`you-3p-road-${idx}`);
    aliases.add(`my-road-${idx}`);
  }

  // Knight kartları
  const knightMatch = cardId.match(/knight-(\d+)/);
  if (knightMatch) {
    const idx = knightMatch[1];
    aliases.add(`knight-${idx}`);
    aliases.add(`${playerId}-knight-${idx}`);
    aliases.add(`you-4p-knight-${idx}`);
    aliases.add(`you-3p-knight-${idx}`);
    aliases.add(`my-knight-${idx}`);
  }

  // Genel prefix/suffix çözümlemesi
  if (cardId.startsWith(`${playerId}-`)) {
    const rawSuffix = cardId.slice(playerId.length + 1);
    aliases.add(rawSuffix);
    aliases.add(`my-${rawSuffix}`);
  } else if (cardId.startsWith('my-')) {
    const rawSuffix = cardId.slice(3);
    aliases.add(rawSuffix);
    aliases.add(`${playerId}-${rawSuffix}`);
  } else if (cardId.startsWith('you-4p-') || cardId.startsWith('you-3p-')) {
    const rawSuffix = cardId.replace(/^you-[34]p-/, '');
    aliases.add(rawSuffix);
    aliases.add(`${playerId}-${rawSuffix}`);
    aliases.add(`my-${rawSuffix}`);
  }

  // Bonus kart varyasyonları
  if (cardId.includes('longest-route')) {
    aliases.add(`${playerId}-bonus-longest-route`);
    aliases.add('bonus-longest-route');
    aliases.add('bonus-4p-longest-route');
    aliases.add('bonus-3p-longest-route');
    aliases.add('table-bonus-longest-route');
  }
  if (cardId.includes('largest-army')) {
    aliases.add(`${playerId}-bonus-largest-army`);
    aliases.add('bonus-largest-army');
    aliases.add('bonus-4p-largest-army');
    aliases.add('bonus-3p-largest-army');
    aliases.add('table-bonus-largest-army');
  }

  return Array.from(aliases);
}

/**
 * Belirli bir oyuncunun kart koordinatını haritadan alias toleranslı sorgulayan yardımcı fonksiyon.
 */
export function resolveCardPosition(
  playerMap: Record<string, CardPosition> | undefined,
  playerId: string,
  cardId: string
): CardPosition | undefined {
  if (!playerMap) return undefined;
  if (playerMap[cardId]) return playerMap[cardId];

  const aliases = getAliasesForCardId(playerId, cardId);
  for (const alias of aliases) {
    if (playerMap[alias]) {
      return playerMap[alias];
    }
  }

  return undefined;
}

/**
 * Masada oynatılan / sürüklenen kartların hem yerel hafızada saklanmasını
 * hem de Supabase Realtime broadcast kanalı (`room:${roomId}`) üzerinden
 * diğer tüm oyunculara anlık ve akıcı olarak yansıtılmasını sağlayan hook.
 */
export function useRealtimeCardPositions(
  options?: UseRealtimeCardPositionsOptions
): UseRealtimeCardPositionsReturn {
  const roomId = options?.roomId;
  const playerId = options?.playerId;
  const throttleMs = options?.throttleMs ?? 60;

  const storageKey =
    options?.storageKey ??
    (roomId
      ? `catankard_card_positions_${roomId}`
      : 'catankard_card_positions_local');

  const legacyStorageKey = options?.legacyStorageKey;

  // 1. Yerel Depolamadan (localStorage) Başlangıç Pozisyonlarını Yükle
  const [positionsByPlayer, setPositionsByPlayer] = useState<
    Record<string, Record<string, CardPosition>>
  >(() => {
    const initialMap: Record<string, Record<string, CardPosition>> = {};

    if (options?.initialPositionsByPlayer) {
      for (const [pId, pMap] of Object.entries(options.initialPositionsByPlayer)) {
        initialMap[pId] = {};
        for (const [cId, cPos] of Object.entries(pMap)) {
          initialMap[pId][cId] = sanitizeCardPosition(cPos);
        }
      }
    }

    if (playerId && options?.initialPositions) {
      initialMap[playerId] = initialMap[playerId] ?? {};
      for (const [cId, cPos] of Object.entries(options.initialPositions)) {
        initialMap[playerId][cId] = sanitizeCardPosition(cPos);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        // Yeni oda/oyuncu bazlı saklama anahtarını dene
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            for (const [pId, pMap] of Object.entries(parsed)) {
              if (pMap && typeof pMap === 'object') {
                initialMap[pId] = initialMap[pId] ?? {};
                for (const [cId, cPos] of Object.entries(pMap as Record<string, CardPosition>)) {
                  initialMap[pId][cId] = sanitizeCardPosition(cPos);
                }
              }
            }
          }
        }

        // Eski tekil oyuncu anahtarı varsa (örn: catankard_4p_card_positions)
        if (legacyStorageKey && playerId) {
          const legacySaved = localStorage.getItem(legacyStorageKey);
          if (legacySaved) {
            const legacyParsed = JSON.parse(legacySaved);
            if (legacyParsed && typeof legacyParsed === 'object') {
              initialMap[playerId] = initialMap[playerId] ?? {};
              for (const [cId, cPos] of Object.entries(legacyParsed as Record<string, CardPosition>)) {
                initialMap[playerId][cId] = sanitizeCardPosition(cPos);
              }
            }
          }
        }
      } catch {
        // Parse hatalarını sessizce yut
      }
    }

    return initialMap;
  });

  // Aktif oyuncunun kendi kart pozisyonları (GameDesk ile tam geriye dönük uyumlu)
  const myPositions: Record<string, CardPosition> =
    (playerId ? positionsByPlayer[playerId] : undefined) ?? {};

  // LocalStorage senkronizasyonu
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(positionsByPlayer));
      if (legacyStorageKey && playerId && positionsByPlayer[playerId]) {
        localStorage.setItem(
          legacyStorageKey,
          JSON.stringify(positionsByPlayer[playerId])
        );
      }
    } catch {
      // ignore storage quota errors
    }
  }, [positionsByPlayer, storageKey, legacyStorageKey, playerId]);

  // Realtime Kanalı ve Canlı Broadcast Dinleme
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!roomId) return;

    const channelName = `room:${roomId}`;
    let channel = options?.customChannel;

    if (!channel) {
      channel = supabase.getChannels().find(
        (c) => c.topic === channelName || c.topic === `realtime:${channelName}`
      );

      if (!channel) {
        channel = supabase.channel(channelName, {
          config: {
            broadcast: { ack: false, self: false },
          },
        });
      }
    }

    channelRef.current = channel;

    const handleBroadcastMessage = (event: any) => {
      const payload: CardMovePayload = event?.payload || event;
      if (!payload || !payload.playerId || !payload.cardId || !payload.pos) {
        return;
      }

      // Kendi gönderdiğimiz broadcast geri yankılanırsa (self: false olsa da koruma)
      if (playerId && payload.playerId === playerId) {
        return;
      }

      const { playerId: senderId, cardId: senderCardId, pos: rawPos } = payload;
      const pos = sanitizeCardPosition(rawPos);

      setPositionsByPlayer((prev) => {
        const senderMap = prev[senderId] ? { ...prev[senderId] } : {};

        // Ana kart ID ve tüm alias varyantlarını güncel tut
        senderMap[senderCardId] = pos;
        const aliases = getAliasesForCardId(senderId, senderCardId);
        for (const alias of aliases) {
          senderMap[alias] = pos;
        }

        return {
          ...prev,
          [senderId]: senderMap,
        };
      });
    };

    channel.on('broadcast', { event: 'card_move' }, handleBroadcastMessage);

    // Eğer kanal henüz abone olunmamışsa abone ol
    if (channel.state === 'closed' || channel.state === 'errored') {
      try {
        channel.subscribe();
      } catch {
        // ignore
      }
    }

    return () => {
      // Sadece bu hook'un dinleyicisini kaldır
      if (channel && channel.bindings?.broadcast) {
        channel.bindings.broadcast = channel.bindings.broadcast.filter(
          (b: any) => b.callback !== handleBroadcastMessage
        );
      }
    };
  }, [roomId, playerId, options?.customChannel]);

  // Broadcast Gönderme Yardımcısı
  const sendBroadcast = useCallback(
    (cardId: string, pos: CardPosition) => {
      if (!roomId || !playerId) return;

      const channel =
        channelRef.current ||
        options?.customChannel ||
        supabase.getChannels().find(
          (c) => c.topic === `room:${roomId}` || c.topic === `realtime:room:${roomId}`
        );

      if (!channel) return;

      const sanitizedPos = sanitizeCardPosition(pos);
      const payload: CardMovePayload = {
        playerId,
        cardId,
        pos: sanitizedPos,
        timestamp: Date.now(),
      };

      try {
        channel.send({
          type: 'broadcast',
          event: 'card_move',
          payload,
        });
      } catch {
        // Çevrimdışı veya bağlantı kopmasında sessizce devam et
      }
    },
    [roomId, playerId, options?.customChannel]
  );

  // Throttled Canlı Yayın Referansları
  const lastBroadcastTimeRef = useRef<Record<string, number>>({});
  const pendingTimerRef = useRef<Record<string, any>>({});
  const pendingPosRef = useRef<Record<string, CardPosition>>({});

  // Temizlik (Unmount esnasında bekleyen timer'ları sonlandır)
  useEffect(() => {
    const timers = pendingTimerRef.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  /**
   * Sürükleme esnasında çağrılır; pozisyonu hemen aktif oyuncunun ekranında günceller,
   * diğer oyunculara ise aşırı paket gönderimini önlemek için `throttleMs` ile canlı yayınlar.
   */
  const broadcastCardPosition = useCallback(
    (cardId: string, pos: CardPosition) => {
      if (!playerId) return;

      const safePos = sanitizeCardPosition(pos);

      // 1. Kendi yerel state'inde hemen güncelle
      setPositionsByPlayer((prev) => {
        const myMap = prev[playerId] ? { ...prev[playerId] } : {};
        myMap[cardId] = safePos;
        const aliases = getAliasesForCardId(playerId, cardId);
        for (const alias of aliases) {
          myMap[alias] = safePos;
        }
        return {
          ...prev,
          [playerId]: myMap,
        };
      });

      // 2. Throttle ile diğer oyunculara broadcast gönder
      const now = Date.now();
      const lastTime = lastBroadcastTimeRef.current[cardId] || 0;
      const elapsed = now - lastTime;

      if (elapsed >= throttleMs) {
        lastBroadcastTimeRef.current[cardId] = now;
        if (pendingTimerRef.current[cardId]) {
          clearTimeout(pendingTimerRef.current[cardId]);
          delete pendingTimerRef.current[cardId];
        }
        sendBroadcast(cardId, safePos);
      } else {
        pendingPosRef.current[cardId] = safePos;
        if (!pendingTimerRef.current[cardId]) {
          pendingTimerRef.current[cardId] = setTimeout(() => {
            const finalPending = pendingPosRef.current[cardId];
            if (finalPending) {
              lastBroadcastTimeRef.current[cardId] = Date.now();
              sendBroadcast(cardId, finalPending);
              delete pendingPosRef.current[cardId];
            }
            delete pendingTimerRef.current[cardId];
          }, throttleMs - elapsed);
        }
      }
    },
    [playerId, throttleMs, sendBroadcast]
  );

  /**
   * Sürükleme bittiğinde (drop / pointer up) çağrılır; bekleyen timer'ları temizler,
   * nihai pozisyonu hem anında broadcast eder hem de localStorage'a kalıcı olarak yazar.
   */
  const updatePosition = useCallback(
    (cardId: string, pos: CardPosition) => {
      if (!playerId) return;

      const safePos = sanitizeCardPosition(pos);

      // Bekleyen throttled yayın varsa iptal et ve son kesin pozisyonu yayınla
      if (pendingTimerRef.current[cardId]) {
        clearTimeout(pendingTimerRef.current[cardId]);
        delete pendingTimerRef.current[cardId];
      }
      delete pendingPosRef.current[cardId];
      lastBroadcastTimeRef.current[cardId] = Date.now();

      sendBroadcast(cardId, safePos);

      setPositionsByPlayer((prev) => {
        const myMap = prev[playerId] ? { ...prev[playerId] } : {};
        myMap[cardId] = safePos;
        const aliases = getAliasesForCardId(playerId, cardId);
        for (const alias of aliases) {
          myMap[alias] = safePos;
        }
        return {
          ...prev,
          [playerId]: myMap,
        };
      });
    },
    [playerId, sendBroadcast]
  );

  /**
   * Kendi kartının veya belirtilen oyuncunun kartının koordinatını getirir.
   */
  const getPosition = useCallback(
    (cardId: string, targetPlayerId?: string): CardPosition => {
      const pid = targetPlayerId ?? playerId;
      if (!pid) return { x: 0, y: 0 };
      const resolved = resolveCardPosition(positionsByPlayer[pid], pid, cardId);
      return resolved ?? { x: 0, y: 0 };
    },
    [playerId, positionsByPlayer]
  );

  /**
   * Belirli bir oyuncunun kart koordinatını alias toleransıyla getirir.
   */
  const getPlayerCardPosition = useCallback(
    (targetPlayerId: string, cardId: string): CardPosition => {
      const resolved = resolveCardPosition(
        positionsByPlayer[targetPlayerId],
        targetPlayerId,
        cardId
      );
      return resolved ?? { x: 0, y: 0 };
    },
    [positionsByPlayer]
  );

  /**
   * Tek bir kartın pozisyonunu sıfırlar ve sıfırlandığını broadcast eder.
   */
  const resetPosition = useCallback(
    (cardId: string, targetPlayerId?: string) => {
      const pid = targetPlayerId ?? playerId;
      if (!pid) return;

      if (pid === playerId) {
        sendBroadcast(cardId, { x: 0, y: 0 });
      }

      setPositionsByPlayer((prev) => {
        const playerMap = prev[pid] ? { ...prev[pid] } : {};
        const aliases = getAliasesForCardId(pid, cardId);
        for (const k of aliases) {
          delete playerMap[k];
        }
        return {
          ...prev,
          [pid]: playerMap,
        };
      });
    },
    [playerId, sendBroadcast]
  );

  /**
   * Tüm kartların pozisyonlarını sıfırlar ve yerel belleği temizler.
   */
  const resetAllPositions = useCallback(() => {
    setPositionsByPlayer({});
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
        if (legacyStorageKey) {
          localStorage.removeItem(legacyStorageKey);
        }
      } catch {
        // ignore
      }
    }
  }, [storageKey, legacyStorageKey]);

  return {
    positionsByPlayer,
    positions: myPositions,
    updatePosition,
    broadcastCardPosition,
    getPosition,
    getPlayerCardPosition,
    resetPosition,
    resetAllPositions,
    setPositionsByPlayer,
  };
}

export default useRealtimeCardPositions;
