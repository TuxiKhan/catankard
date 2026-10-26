import { useState, useEffect, useCallback } from 'react';
import { assetUrl } from './assetUrl.ts';
import { cardAudio } from './animationHooks.ts';

const MUTE_STORAGE_KEY = 'catankard_bgm_muted';
const VOLUME_STORAGE_KEY = 'catankard_bgm_volume';
const AUDIO_ELEMENT_ID = 'catankard-singleton-bgm-audio';
const DEFAULT_VOLUME = 0.35;

interface AudioState {
  muted: boolean;
  volume: number;
}

const stateListeners = new Set<(state: AudioState) => void>();
let isPlayRequested = false;
let playPromiseInFlight: Promise<void> | null = null;

function getInitialMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getInitialVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_VOLUME;
}

function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_VOLUME;
  return Math.max(0, Math.min(1, v));
}

/**
 * Sayfada yalnızca TEK bir <audio> elemanı olmasını garanti eder.
 * Birden fazla örnek oluşup yankı (echo) yapmasını engeller.
 */
function getSingletonAudioElement(): HTMLAudioElement | null {
  if (typeof document === 'undefined') return null;

  let el = document.getElementById(AUDIO_ELEMENT_ID) as HTMLAudioElement | null;
  if (!el) {
    document.querySelectorAll('audio[data-catankard-bgm="true"]').forEach((node) => {
      try {
        (node as HTMLAudioElement).pause();
        node.remove();
      } catch {}
    });

    el = document.createElement('audio');
    el.id = AUDIO_ELEMENT_ID;
    el.setAttribute('data-catankard-bgm', 'true');
    el.src = assetUrl('/assets/audio/catan-relaxing-mix.mp3');
    el.loop = true;
    el.preload = 'auto';
    el.setAttribute('playsinline', 'true');
    el.style.display = 'none';

    const initialMuted = getInitialMuted();
    const initialVol = getInitialVolume();
    el.muted = initialMuted || initialVol === 0;
    el.volume = initialMuted ? 0 : initialVol;
    cardAudio.setEnabled(!el.muted);

    // Döngü garantisi: Parça bittiğinde baştan tekrar başlasın
    el.addEventListener('ended', () => {
      if (el && isPlayRequested) {
        el.currentTime = 0;
        safePlayAudio(el);
      }
    });

    document.body.appendChild(el);
  }

  return el;
}

function safePlayAudio(audio: HTMLAudioElement) {
  if (!isPlayRequested) return;
  if (!audio.paused || playPromiseInFlight) return;

  try {
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      playPromiseInFlight = p
        .catch(() => {})
        .finally(() => {
          playPromiseInFlight = null;
        });
    }
  } catch {
    playPromiseInFlight = null;
  }
}

function notifyListeners(muted: boolean, volume: number) {
  stateListeners.forEach((fn) => fn({ muted, volume }));
}

function applyAudioSettings(nextMuted: boolean, nextVolume: number) {
  const safeVol = clampVolume(nextVolume);
  const effectiveMuted = nextMuted || safeVol === 0;
  const audio = getSingletonAudioElement();

  if (audio) {
    audio.muted = effectiveMuted;
    audio.volume = effectiveMuted ? 0 : safeVol;
    if (isPlayRequested && audio.paused) {
      safePlayAudio(audio);
    }
  }

  cardAudio.setEnabled(!effectiveMuted);

  try {
    localStorage.setItem(MUTE_STORAGE_KEY, String(effectiveMuted));
    if (safeVol > 0) {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(safeVol));
    }
  } catch {}

  notifyListeners(effectiveMuted, safeVol);
}

/**
 * Oyun esnasında arka planda çalan lobi/masa müziği yöneticisi.
 * Oyun başladığında çalmaya başlar, sessize alınsa dahi arka planda ilerlemeye devam eder,
 * bittiğinde döngü halinde baştan başlar ve yalnızca oyun bittiğinde/masadan çıkıldığında durur.
 */
export function useBackgroundMusic(isPlaying?: boolean) {
  const [isMuted, setIsMuted] = useState<boolean>(getInitialMuted);
  const [volume, setVolumeState] = useState<number>(getInitialVolume);

  useEffect(() => {
    const currentMuted = getInitialMuted();
    const currentVol = getInitialVolume();
    setIsMuted(currentMuted);
    setVolumeState(currentVol);
    cardAudio.setEnabled(!(currentMuted || currentVol === 0));

    const listener = (state: AudioState) => {
      setIsMuted(state.muted);
      setVolumeState(state.volume);
    };
    stateListeners.add(listener);
    return () => {
      stateListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (isPlaying === undefined) return;
    isPlayRequested = isPlaying;

    const audio = getSingletonAudioElement();
    if (!audio) return;

    const muted = getInitialMuted();
    const vol = getInitialVolume();
    audio.muted = muted || vol === 0;
    audio.volume = muted ? 0 : vol;

    if (!isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    safePlayAudio(audio);

    const handleUserGesture = () => {
      if (isPlayRequested && audio.paused) {
        safePlayAudio(audio);
      }
    };

    window.addEventListener('pointerdown', handleUserGesture, { passive: true });
    window.addEventListener('keydown', handleUserGesture, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
    };
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const currentlyMuted = getInitialMuted();
    const currentVol = getInitialVolume();
    const nextMuted = !currentlyMuted;
    const restoredVol = !nextMuted && currentVol === 0 ? DEFAULT_VOLUME : currentVol;
    applyAudioSettings(nextMuted, restoredVol);
  }, []);

  const setVolume = useCallback((newVol: number) => {
    const safeVol = clampVolume(newVol);
    applyAudioSettings(safeVol === 0, safeVol);
  }, []);

  return {
    isMuted,
    volume: isMuted ? 0 : volume,
    setVolume,
    toggleMute,
  };
}
