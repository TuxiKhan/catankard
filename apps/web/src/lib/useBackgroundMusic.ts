import { useState, useEffect, useCallback } from 'react';
import { assetUrl } from './assetUrl.ts';

const MUTE_STORAGE_KEY = 'catankard_bgm_muted';

let sharedAudio: HTMLAudioElement | null = null;
const muteListeners = new Set<(muted: boolean) => void>();

function getInitialMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getSharedAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudio) {
    sharedAudio = new Audio(assetUrl('/assets/audio/catan-relaxing-mix.mp3'));
    sharedAudio.loop = true;
    sharedAudio.preload = 'auto';
    sharedAudio.volume = 0.35;
    sharedAudio.muted = getInitialMuted();

    // Döngü garantisi: Parça bittiğinde baştan tekrar başlasın
    sharedAudio.addEventListener('ended', () => {
      if (sharedAudio) {
        sharedAudio.currentTime = 0;
        sharedAudio.play().catch(() => {});
      }
    });
  }
  return sharedAudio;
}

/**
 * Oyun esnasında arka planda çalan lobi/masa müziği yöneticisi.
 * Oyun başladığında çalmaya başlar, sessize alınsa dahi arka planda ilerlemeye devam eder,
 * bittiğinde döngü halinde baştan başlar ve yalnızca oyun bittiğinde/masadan çıkıldığında durur.
 */
export function useBackgroundMusic(isPlaying?: boolean) {
  const [isMuted, setIsMuted] = useState<boolean>(getInitialMuted);

  useEffect(() => {
    const listener = (muted: boolean) => setIsMuted(muted);
    muteListeners.add(listener);
    return () => {
      muteListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (isPlaying === undefined) return;
    const audio = getSharedAudio();
    if (!audio) return;

    if (!isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const tryPlay = () => {
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    };

    tryPlay();

    const unlockEvents = ['pointerdown', 'keydown', 'touchstart', 'click'] as const;
    const handleUnlock = () => {
      if (isPlaying && audio.paused) {
        audio.play().catch(() => {});
      }
    };

    unlockEvents.forEach((evt) =>
      window.addEventListener(evt, handleUnlock, { passive: true })
    );

    return () => {
      unlockEvents.forEach((evt) => window.removeEventListener(evt, handleUnlock));
    };
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const audio = getSharedAudio();
    const nextMuted = !(audio ? audio.muted : getInitialMuted());
    if (audio) {
      audio.muted = nextMuted;
      // Sessize alınsa da alınmasa da çalmaya devam etmesini garanti et
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    }
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, String(nextMuted));
    } catch {}
    muteListeners.forEach((fn) => fn(nextMuted));
  }, []);

  return {
    isMuted,
    toggleMute,
  };
}
