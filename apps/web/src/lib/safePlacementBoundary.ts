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
}

/** El kartlarının kapladığı yasak alt bölgenin yaklaşık piksel değerleri */
export const HAND_ZONE_CONFIG = {
  /** Ekranın altından itibaren yasak bölge yüksekliği */
  HEIGHT: 222,
  /** 3P için yatayda el yelpazesinin kapladığı merkez genişlik */
  CENTER_WIDTH: 540,
  /** 4P için sağ köşede el yelpazesinin kapladığı genişlik */
  RIGHT_WIDTH: 440,
  /** Kartın güvenli sınırda oturacağı minimum emniyet mesafesi */
  SAFE_CLEARANCE: 228,
};

/**
 * Kullanıcı masadaki bir kartı sürüklerken veya bırakırken,
 * kartın el kartlarının bulunduğu "Yasak Bölge (No-Card Zone / Hand Zone)" içine
 * girmesini engelleyen ve güvenli bölgenin sınırına yaslayan (clamp/snap) koordinat sınırlandırıcı.
 */
export function createSafeZoneClamper(config: SafeBoundaryConfig) {
  const {
    layout = '3P',
    handPosition = layout === '4P' ? 'bottom-right' : 'bottom-center',
    slotIndex = 0,
    totalSlots = 1,
    cardWidth = 110,
  } = config;

  return function clampPosition(pos: CardPosition): CardPosition {
    const { x, y } = pos;

    // 1. Yatay Yuva Ofseti Hesaplama
    // Varsayılan yuva merkezden ne kadar uzakta?
    const slotSpacing = cardWidth + 24;
    const midIndex = (totalSlots - 1) / 2;
    const defaultSlotOffsetX = (slotIndex - midIndex) * slotSpacing;

    // Kartın masa merkezine göre efektif yatay konumu (piksel)
    const effectiveCenterX = defaultSlotOffsetX + x;

    // Kartın kapladığı yatay aralık [left, right]
    const cardHalfW = cardWidth / 2;
    const cardLeft = effectiveCenterX - cardHalfW;
    const cardRight = effectiveCenterX + cardHalfW;

    // 2. Yasak Bölge (Hand Zone) Çakışma Denetimi
    let inForbiddenHandZone = false;

    if (handPosition === 'bottom-center' || layout === '3P') {
      // 3P: Ekranın alt ortasındaki ~540px genişliğindeki el bölgesi
      const handZoneHalfW = HAND_ZONE_CONFIG.CENTER_WIDTH / 2;
      const handLeft = -handZoneHalfW;
      const handRight = handZoneHalfW;

      // Kart el bölgesi ile yatayda çakışıyor mu?
      inForbiddenHandZone = cardRight > handLeft && cardLeft < handRight;
    } else {
      // 4P: Ekranın sağ alt köşesindeki ~440px el bölgesi
      // 4P'de kullanıcı sağ alt kadranda olduğu için sağa doğru taşınan kartlar el bölgesine girer
      inForbiddenHandZone = cardRight > -30;
    }

    // 3. Dikey Sınırlandırma (Y Clamp & Safe Snap)
    // y < 0: Kart yukarı (masanın ortasına / serbest alana) taşınıyor
    // y > 0: Kart aşağı (el kartlarına / ekrandan dışarı) taşınıyor
    let clampedY = y;

    if (inForbiddenHandZone) {
      // YASAK BÖLGE: Kart el kartlarının kapladığı alana indirilemez!
      // Aşağı doğru inmeye (y > 0) izin verme, hemen güvenli sınırda tut (y <= 0)
      clampedY = Math.min(0, y);
    } else {
      // Serbest Bölge (Elin sağı veya solu):
      // Kartlar el kartlarının arkasında kalmadığı için hafifçe aşağı inebilir (footer üstü)
      clampedY = Math.min(150, y);
    }

    // Masanın çok yukarısına (Bina Dizisi Matı veya rakiplerin üstüne) taşmayı engelle
    clampedY = Math.max(-230, clampedY);

    // 4. Yatay Sınırlandırma (X Clamp)
    // Kartın masanın tamamen dışına fırlamasını engelle
    const maxHorizontalSpan = layout === '4P' ? 360 : 540;
    const clampedX = Math.max(-maxHorizontalSpan, Math.min(maxHorizontalSpan, x));

    return {
      x: Math.round(clampedX),
      y: Math.round(clampedY),
    };
  };
}
