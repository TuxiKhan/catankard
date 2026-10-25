import { useState, useEffect } from 'react';

export interface ResponsiveLayoutMetrics {
  width: number;
  height: number;
  isMobile: boolean;
  isPortrait: boolean;
  isMobilePortrait: boolean;
  isMobileLandscape: boolean;
  isCompactHeight: boolean;
  marketScale: number;
  opponentCardScale: number;
  opponentHandScale: number;
  playerCardScale: number;
  playerHandScale: number;
  bonusCardBaseW: number;
  bonusCardBaseH: number;
}

export function useResponsiveLayout(): ResponsiveLayoutMetrics {
  const [size, setSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));

  useEffect(() => {
    const onResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const { width, height } = size;

  const isPortrait = height > width;
  const isMobile = width < 768 || height < 500;
  const isMobilePortrait = isMobile && isPortrait;
  const isMobileLandscape = isMobile && !isPortrait;
  const isCompactHeight = height <= 680;

  // Market (BuildingRowMat) Ölçeği (PC için dokunulmaz, mobilde oynanabilir büyük)
  let marketScale = 0.95;
  if (isMobilePortrait) {
    marketScale = 0.38;
  } else if (isMobileLandscape) {
    marketScale = 0.54;
  } else if (width <= 1024 || height <= 680) {
    marketScale = 0.68;
  }

  // Rakiplerin Masadaki Kartları & Eli Ölçeği (PC için dokunulmaz)
  let opponentCardScale = 1.0;
  let opponentHandScale = 0.78;
  if (isMobilePortrait) {
    opponentCardScale = 0.38;
    opponentHandScale = 0.37;
  } else if (isMobileLandscape) {
    opponentCardScale = 0.38;
    opponentHandScale = 0.38;
  } else if (width <= 1024 || height <= 680) {
    opponentCardScale = 0.70;
    opponentHandScale = 0.60;
  }

  // Oyuncunun Masadaki Kartları & Eli Ölçeği (PC için dokunulmaz, mobilde tam oynanabilir)
  let playerCardScale = 1.0;
  let playerHandScale = 0.95;
  if (isMobilePortrait) {
    playerCardScale = 0.43;
    playerHandScale = 0.42;
  } else if (isMobileLandscape) {
    playerCardScale = 0.55;
    playerHandScale = 0.58;
  } else if (width <= 1024 || height <= 680) {
    playerCardScale = 0.78;
    playerHandScale = 0.75;
  }

  // Bonus kartların yatay boyutu
  const bonusCardBaseW = 186;
  const bonusCardBaseH = 120;

  return {
    width,
    height,
    isMobile,
    isPortrait,
    isMobilePortrait,
    isMobileLandscape,
    isCompactHeight,
    marketScale,
    opponentCardScale,
    opponentHandScale,
    playerCardScale,
    playerHandScale,
    bonusCardBaseW,
    bonusCardBaseH,
  };
}
