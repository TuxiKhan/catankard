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
}

/** El kartlarının kapladığı yasak alt bölgenin yaklaşık piksel değerleri (Daraltılmış Çerçeve) */
export const HAND_ZONE_CONFIG = {
  /** Ekranın altından itibaren yasak bölge yüksekliği */
  HEIGHT: 190,
  /** 3P için yatayda el yelpazesinin kapladığı daraltılmış merkez genişlik */
  CENTER_WIDTH: 360,
  /** 4P için sağ köşede el yelpazesinin kapladığı genişlik */
  RIGHT_WIDTH: 320,
  /** Kartın güvenli sınırda oturacağı minimum emniyet mesafesi */
  SAFE_CLEARANCE: 195,
};

/**
 * Kartın sürükleme esnasında ekran sınırlarından (viewport) dışarı taşmasını engeller:
 * - Sol ve sağ sınırlarda: window.innerWidth - 12px (ve sol >= 12px)
 * - Alt sınırda: window.innerHeight - 12px
 * - Üst sınırda: top >= 50px
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
  const topMargin = options?.topMargin ?? 50;

  let clampedX = pos.x;
  let clampedY = pos.y;

  const minScreenX = margin;
  const maxScreenX = winW - margin;
  const minScreenY = topMargin;
  const maxScreenY = winH - margin;

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
 * kartın masa ve tarayıcı ekranı dışına taşmasını engelleyen ve güvenli bölgenin sınırına yaslayan (clamp)
 * koordinat sınırlandırıcı.
 *
 * Sıkı sınırlar:
 * - 4P (sağ alt oyuncu masası): minX = -140, maxX = 40, minY = -100, maxY = 30
 * - 3P (alt merkez oyuncu masası): minX = -120, maxX = 120, minY = -100, maxY = 30
 * - window.innerWidth ve window.innerHeight sınırları (12px pay)
 */
export function createSafeZoneClamper(config: SafeBoundaryConfig) {
  const {
    viewportWidth,
    viewportHeight,
    margin = 12,
  } = config;

  return function clampPosition(pos: CardPosition): CardPosition {
    const { x, y } = pos;

    // Kullanıcının kırmızı dikdörtgen ile belirlediği serbest sürükleme sınırları:
    // Sola: -140px (aksiyon butonlarına kadar)
    // Sağa: 100px (el kartlarına kadar)
    // Yukarı: -75px (market sırasına kadar)
    // Aşağı: 45px (ekran altına kadar)
    let minX = -140;
    let maxX = 100;
    let minY = -75;
    let maxY = 45;

    const winW =
      viewportWidth ??
      (typeof window !== 'undefined' ? window.innerWidth : undefined);
    const winH =
      viewportHeight ??
      (typeof window !== 'undefined' ? window.innerHeight : undefined);

    if (winW !== undefined && winH !== undefined) {
      // 12px emniyet payı ile ekran sınırlarını aşmayacak dinamik daraltma
      const maxAllowedX = Math.max(10, Math.floor((winW - margin * 2) / 4));
      const maxAllowedY = Math.max(10, Math.floor((winH - margin * 2) / 6));

      minX = Math.max(minX, -maxAllowedX);
      maxX = Math.min(maxX, maxAllowedX);
      minY = Math.max(minY, -maxAllowedY);
      maxY = Math.min(maxY, maxAllowedY);
    }

    const clampedX = Math.max(minX, Math.min(maxX, x));
    const clampedY = Math.max(minY, Math.min(maxY, y));

    return {
      x: Math.round(clampedX),
      y: Math.round(clampedY),
    };
  };
}
