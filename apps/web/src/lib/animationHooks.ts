import { useEffect, useRef, useState, useCallback } from 'react';
import type { BuildingCard, GameLogEntry, PlayerId, PlayerView, Resource } from '@catankard/engine';

export interface FlyingCard {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startRotation?: number;
  endRotation?: number;
  cardImageUrl?: string;
  cardBackUrl?: string;
  flipDuringFlight?: boolean;
  scale?: number;
  durationMs?: number;
  delayMs?: number;
  label?: string;
}

export interface ImpactEffect {
  id: string;
  x: number;
  y: number;
  color?: string;
  size?: number;
  label?: string;
}

export interface PlayerSeatPosition {
  playerId: PlayerId;
  name?: string;
  x: number; // percentage (0-100) or px
  y: number; // percentage (0-100) or px
  isPx?: boolean;
}

/**
 * Web Audio API tabanlı sentetik kart sesleri üreticisi.
 * Dış dosya gerektirmez, 0 bayt network yükü ile Hearthstone/Balatro kalitesinde
 * ses efektleri (karılma fısıltısı, kart kayması, masa çarpma darbesi) üretir.
 */
class CardAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;

  private initContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  /** Kart Karılma (Riffle Shuffle flutter sesi) */
  public playShuffle() {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // 12 minik kart hışırtı vuruşu
      for (let i = 0; i < 12; i++) {
        const time = now + i * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600 + Math.random() * 400, time);
        filter.Q.setValueAtTime(3, time);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140 + Math.random() * 60, time);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(0.04, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.04);
      }
    } catch {
      // AudioContext engellendiğinde sessizce yut
    }
  }

  /** Kart Çekme / Havada Süzülme (Whoosh) */
  public playDealOrDraw() {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(1600, now + 0.12);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.28);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.28);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {}
  }

  /** Yere Kart Koyma / Darbe Vuruşu (Snap / Board Thud & Click) */
  public playSnapToTable() {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Tok Masa Vuruşu (Sub-bass thump)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.16);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);

      // 2. Kartın Sert Yüzeyle Teması (Sharp Click)
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(980, now);
      clickOsc.frequency.exponentialRampToValueAtTime(120, now + 0.035);

      clickGain.gain.setValueAtTime(0.07, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.04);
    } catch {}
  }

  /** Kart Ters Çevirme (3D Card Flip) */
  public playCardFlip() {
    if (!this.soundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(600, now);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(680, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch {}
  }
}

export const cardAudio = new CardAudioSynthesizer();

/**
 * Kart uçuş ve etki kuyruğunu yöneten ana React hook'u.
 */
export function useCardAnimations() {
  const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([]);
  const [impacts, setImpacts] = useState<ImpactEffect[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);

  const spawnFlight = useCallback((flight: Omit<FlyingCard, 'id'>) => {
    const id = `flight-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newFlight: FlyingCard = { ...flight, id };

    setFlyingCards((prev) => [...prev, newFlight]);
    cardAudio.playDealOrDraw();

    const totalDuration = (flight.durationMs ?? 650) + (flight.delayMs ?? 0);
    setTimeout(() => {
      setFlyingCards((prev) => prev.filter((c) => c.id !== id));
    }, totalDuration + 100);

    return id;
  }, []);

  const spawnImpact = useCallback((impact: Omit<ImpactEffect, 'id'>) => {
    const id = `impact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newImpact: ImpactEffect = { ...impact, id };

    setImpacts((prev) => [...prev, newImpact]);
    cardAudio.playSnapToTable();

    setTimeout(() => {
      setImpacts((prev) => prev.filter((i) => i.id !== id));
    }, 800);

    return id;
  }, []);

  const triggerShuffle = useCallback((onComplete?: () => void) => {
    setIsShuffling(true);
    cardAudio.playShuffle();

    setTimeout(() => {
      setIsShuffling(false);
      onComplete?.();
    }, 1500);
  }, []);

  const clearAll = useCallback(() => {
    setFlyingCards([]);
    setImpacts([]);
    setIsShuffling(false);
  }, []);

  return {
    flyingCards,
    impacts,
    isShuffling,
    spawnFlight,
    spawnImpact,
    triggerShuffle,
    clearAll,
  };
}

/**
 * Mağazadaki (`buildingRow`) kart değişikliklerini izleyip,
 * boşalan yuvaya yeni kartın desteden kayıp 3D flip ile açılmasını tetikleyen hook.
 */
export function useReplenishDetector(buildingRow: BuildingCard[]) {
  const prevRowRef = useRef<Array<string | null>>([null, null, null, null, null]);
  const [replenishingIndices, setReplenishingIndices] = useState<Set<number>>(new Set());
  const clearTimerRef = useRef<number | null>(null);

  const rowSignature = buildingRow.map((c) => c?.id ?? '').join('|');

  useEffect(() => {
    const currentIds = [0, 1, 2, 3, 4].map((i) => buildingRow[i]?.id ?? null);
    const prevIds = prevRowRef.current;

    const newlyFilled = new Set<number>();

    for (let i = 0; i < 5; i++) {
      const cur = currentIds[i];
      const prev = prevIds[i];

      // Eğer önceki slot boş değildi ve yeni bir kart ID'si geldiyse (mağaza yenilendi)
      if (cur && prev && cur !== prev) {
        newlyFilled.add(i);
      }
    }

    prevRowRef.current = currentIds;

    if (newlyFilled.size > 0) {
      setReplenishingIndices((prev) => {
        const merged = new Set(prev);
        newlyFilled.forEach((idx) => merged.add(idx));
        return merged;
      });
      cardAudio.playCardFlip();

      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current);
      }
      clearTimerRef.current = window.setTimeout(() => {
        setReplenishingIndices(new Set());
        clearTimerRef.current = null;
      }, 900);
    }
  }, [rowSignature]);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  const isReplenishing = useCallback(
    (index: number) => replenishingIndices.has(index),
    [replenishingIndices]
  );

  return {
    replenishingIndices,
    isReplenishing,
  };
}

/**
 * Oyunun ilk açılışında Karılma + Dağıtılma senaryosunu otomatikleştiren hook.
 */
export function useGameOpeningSequence({
  view,
  onComplete,
}: {
  view?: PlayerView | null;
  onComplete?: () => void;
}) {
  const [openingPhase, setOpeningPhase] = useState<'idle' | 'shuffling' | 'dealing' | 'done'>('idle');
  const hasPlayedRef = useRef<boolean>(false);

  const startOpening = useCallback(() => {
    setOpeningPhase('shuffling');
    cardAudio.playShuffle();

    // 1. Adım: Karılma 1.4s sürer
    setTimeout(() => {
      setOpeningPhase('dealing');
      cardAudio.playDealOrDraw();

      // 2. Adım: Kart Dağıtımı 1.4s sürer
      setTimeout(() => {
        setOpeningPhase('done');
        onComplete?.();
      }, 1400);
    }, 1400);
  }, [onComplete]);

  useEffect(() => {
    if (!view) return;
    // Eğer oyun henüz 1. turdaysa ve daha önce açılış oynamadıysa
    if (view.turnNumber === 1 && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      startOpening();
    }
  }, [view?.turnNumber, startOpening]);

  const skipOpening = useCallback(() => {
    setOpeningPhase('done');
    onComplete?.();
  }, [onComplete]);

  return {
    openingPhase,
    startOpening,
    skipOpening,
    isPlayingOpening: openingPhase === 'shuffling' || openingPhase === 'dealing',
  };
}

/**
 * `PlayerView.recentLog` akışını dinleyerek:
 * - Hasat/kart çekildiğinde kart uçuşu,
 * - Kart inşa edildiğinde yere darbe ve sarsıntı efektlerini otomatik tetikleyen hook.
 */
export function useLogAnimationListener({
  recentLog,
  youPlayerId,
  onDrawCard,
  onPlayCard,
}: {
  recentLog?: GameLogEntry[];
  youPlayerId?: PlayerId;
  onDrawCard?: (playerId: PlayerId, count: number) => void;
  onPlayCard?: (playerId: PlayerId, cardType: string) => void;
}) {
  const lastProcessedIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (!recentLog || recentLog.length === 0) return;

    if (lastProcessedIndexRef.current === -1) {
      lastProcessedIndexRef.current = recentLog.length - 1;
      return;
    }

    const newEntries = recentLog.slice(lastProcessedIndexRef.current + 1);
    lastProcessedIndexRef.current = recentLog.length - 1;

    for (const entry of newEntries) {
      if (entry.t === 'harvest') {
        Object.entries(entry.draws).forEach(([pid, count]) => {
          if (count > 0) {
            onDrawCard?.(pid as PlayerId, count);
          }
        });
      } else if (entry.t === 'built') {
        onPlayCard?.(entry.playerId, entry.card);
      }
    }
  }, [recentLog, youPlayerId, onDrawCard, onPlayCard]);
}
