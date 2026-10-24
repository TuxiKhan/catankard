import type { CardPosition } from './useDraggablePlacement.ts';

export interface SafeBoundaryConfig {
  /** 3 Oyunculu veya 4 Oyunculu masa düzeni */
  layout: '3P' | '4P';
  /** El kartlarının hizalaması */
  handPosition?: 'bottom-center' | 'bottom-right';
  /** Kartın varsayılan yuva indeksi */
  slotIndex?: number;
  /** Masadaki toplam kart yığını sayısı */
  totalSlots?: number;
  /** Kart genişliği (varsayılan: 110px) */
  cardWidth?: number;
  /** Kart yüksekliği (varsayılan: 160px) */
  cardHeight?: number;
  /** Viewport genişliği (varsayılan: window.innerWidth) */
  viewportWidth?: number;
  /** Viewport yüksekliği (varsayılan: window.innerHeight) */
  viewportHeight?: number;
  /** Güvenli kenar payı (varsayılan: 12px) */
  margin?: number;
}

export interface BaseElementRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ViewportBoundaryOptions {
  viewportWidth?: number;
  viewportHeight?: number;
  margin?: number;
  topMargin?: number;
  minScreenX?: number;
  maxScreenX?: number;
  minScreenY?: number;
  maxScreenY?: number;
}

/** El kartlarının kapladığı yasak alt bölgenin yaklaşık piksel değerleri */
export const HAND_ZONE_CONFIG = {
  HEIGHT: 190,
  CENTER_WIDTH: 360,
  RIGHT_WIDTH: 320,
  SAFE_CLEARANCE: 195,
};

/**
 * Kartın sürükleme esnasında ekran sınırlarından (viewport) ve
 * kullanıcının kırmızı dikdörtgen ile belirttiği geniş serbest alandan dışarı taşmasını engeller:
 * - Sol sınır: Masanın ortasındaki butonların hemen sağı (veya minScreenX)
 * - Sağ sınır: window.innerWidth - 12px
 * - Üst sınır: Orta bina dizisi tepsisinin altı (veya topMargin)
 * - Alt sınır: window.innerHeight - 12px
 */
export function clampPositionToViewport(
  pos: CardPosition,
  baseRect: BaseElementRect,
  options?: ViewportBoundaryOptions
): CardPosition {
  const winW =
    options?.viewportWidth ??
    (typeof window !== 'undefined' ? window.innerWidth : undefined);
  const winH =
    options?.viewportHeight ??
    (typeof window !== 'undefined' ? window.innerHeight : undefined);

  if (winW === undefined || winH === undefined) {
    return pos;
  }

  const margin = options?.margin ?? 12;

  // Geniş kırmızı alan sınırları (Kullanıcının işaretlediği alan):
  // 1. Sol: Masanın merkez aksiyon butonlarının hemen sağı
  const defaultMinX = Math.max(margin, Math.round(winW * 0.46));
  const minScreenX = options?.minScreenX ?? defaultMinX;
  const maxScreenX = options?.maxScreenX ?? (winW - margin);

  // 2. Üst: Orta bina sırasının hemen altı
  const defaultMinY = Math.max(options?.topMargin ?? 50, Math.round(winH * 0.50) + 15);
  const minScreenY = options?.minScreenY ?? defaultMinY;
  const maxScreenY = options?.maxScreenY ?? (winH - margin);

  let clampedX = pos.x;
  let clampedY = pos.y;

  const minAllowedX = minScreenX - baseRect.left;
  const maxAllowedX = maxScreenX - baseRect.left - baseRect.width;

  if (minAllowedX <= maxAllowedX) {
    clampedX = Math.max(minAllowedX, Math.min(maxAllowedX, clampedX));
  }

  const minAllowedY = minScreenY - baseRect.top;
  const maxAllowedY = maxScreenY - baseRect.top - baseRect.height;

  if (minAllowedY <= maxAllowedY) {
    clampedY = Math.max(minAllowedY, Math.min(maxAllowedY, clampedY));
  }

  return {
    x: Math.round(clampedX),
    y: Math.round(clampedY),
  };
}

/**
 * Kullanıcı masadaki bir kartı sürüklerken veya bırakırken,
 * kartın masa ve tarayıcı ekranı dışına taşmasını engelleyen ve geniş güvenli bölgenin sınırına yaslayan (clamp)
 * koordinat sınırlandırıcı.
 *
 * Geniş sınırlar:
 * Kartlar kullanıcının işaretlediği geniş kırmızı alanda (aksiyon butonlarının sağından ekran sağına,
 * market sırasının altından ekran altına kadar) serbestçe sürüklenebilir ve birbiri üstüne konabilir.
 */
export function createSafeZoneClamper(config: SafeBoundaryConfig) {
  const {
    viewportWidth,
    viewportHeight,
    margin = 12,
  } = config;

  return function clampPosition(pos: CardPosition): CardPosition {
    const { x, y } = pos;

    const winW =
      viewportWidth ??
      (typeof window !== 'undefined' ? window.innerWidth : 1280);
    const winH =
      viewportHeight ??
      (typeof window !== 'undefined' ? window.innerHeight : 720);

    // Geniş hareket alanı: kartlar onlarca kart biriktiğinde bile her yöne serbestçe hareket edebilir
    const maxSpanX = Math.max(400, Math.round(winW * 0.65));
    const maxSpanY = Math.max(250, Math.round(winH * 0.50));

    const minX = -maxSpanX;
    const maxX = maxSpanX;
    const minY = -maxSpanY;
    const maxY = maxSpanY;

    const clampedX = Math.max(minX, Math.min(maxX, x));
    const clampedY = Math.max(minY, Math.min(maxY, y));

    return {
      x: Math.round(clampedX),
      y: Math.round(clampedY),
    };
  };
}
