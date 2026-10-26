import { useState, useEffect, useCallback } from 'react';
import { assetUrl } from './assetUrl.ts';
import { cardAudio } from './animationHooks.ts';

const MUTE_STORAGE_KEY = 'catankard_bgm_muted';
const AUDIO_ELEMENT_ID = 'catankard-singleton-bgm-audio';
const TARGET_VOLUME = 0.32;

const muteListeners = new Set<(muted: boolean) => void>();
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

/**
 * Sayfada yalnızca TEK bir <audio> elemanı olmasını garanti eder.
 * Birden fazla örnek oluşup yankı (echo) yapmasını engeller.
 */
function getSingletonAudioElement(): HTMLAudioElement | null {
  if (typeof document === 'undefined') return null;

  let el = document.getElementById(AUDIO_ELEMENT_ID) as HTMLAudioElement | null;
  if (!el) {
    // Varsa sahipsiz diğer audio etiketlerini temizle
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
    el.muted = initialMuted;
    el.volume = initialMuted ? 0 : TARGET_VOLUME;
    cardAudio.setEnabled(!initialMuted);

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

function applyMuteState(muted: boolean) {
  const audio = getSingletonAudioElement();
  if (audio) {
    // Hem muted hem volume=0 birlikte uygulanır (iOS/Android/Masaüstü tam uyumluluk için)
    audio.muted = muted;
    audio.volume = muted ? 0 : TARGET_VOLUME;
    if (isPlayRequested && audio.paused) {
      safePlayAudio(audio);
    }
  }

  // Kart efekt seslerini de senkronize kapat/aç
  cardAudio.setEnabled(!muted);

  try {
    localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
  } catch {}

  muteListeners.forEach((fn) => fn(muted));
}

/**
 * Oyun esnasında arka planda çalan lobi/masa müziği yöneticisi.
 * Oyun başladığında çalmaya başlar, sessize alınsa dahi arka planda ilerlemeye devam eder,
 * bittiğinde döngü halinde baştan başlar ve yalnızca oyun bittiğinde/masadan çıkıldığında durur.
 */
export function useBackgroundMusic(isPlaying?: boolean) {
  const [isMuted, setIsMuted] = useState<boolean>(getInitialMuted);

  useEffect(() => {
    const current = getInitialMuted();
    setIsMuted(current);
    cardAudio.setEnabled(!current);

    const listener = (muted: boolean) => setIsMuted(muted);
    muteListeners.add(listener);
    return () => {
      muteListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (isPlaying === undefined) return;
    isPlayRequested = isPlaying;

    const audio = getSingletonAudioElement();
    if (!audio) return;

    const muted = getInitialMuted();
    audio.muted = muted;
    audio.volume = muted ? 0 : TARGET_VOLUME;

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
    const audio = getSingletonAudioElement();
    const currentlyMuted = audio ? audio.muted || audio.volume === 0 : getInitialMuted();
    applyMuteState(!currentlyMuted);
  }, []);

  return {
    isMuted,
    toggleMute,
  };
}
