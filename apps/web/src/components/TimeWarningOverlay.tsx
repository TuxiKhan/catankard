import React from 'react';

export interface TimeWarningOverlayProps {
  /** Aktif sıranın kullanıcıda olup olmadığını belirtir */
  isActive?: boolean;
  /** Kalan tur süresi (saniye cinsinden). null ise süre sınırı yoktur */
  remainingSeconds?: number | null;
  /** Doğrudan uyarı durumunu tetiklemek için (verilirse isActive & remainingSeconds yerine geçer) */
  isWarning?: boolean;
  /** Üst kısımda nabız gibi atan "SON X SANİYE" rozetini göster/gizle (varsayılan: true) */
  showBadge?: boolean;
  /** Ekstra CSS sınıfları */
  className?: string;
}

/**
 * Sıra oyuncudayken son 10 saniyede ekranın dört bir yanını saran
 * dramatik kırmızı parıltı, köşe ışıkları ve son 5 saniyede hızlanan
 * nabız / flaş efektine sahip zaman uyarı katmanı.
 */
export const TimeWarningOverlay: React.FC<TimeWarningOverlayProps> = ({
  isActive,
  remainingSeconds = null,
  isWarning,
  showBadge = true,
  className = '',
}) => {
  // Eğer isWarning açıkça verilmişse onu kullan; yoksa isActive ve süreyi kontrol et
  const isTriggered =
    isWarning !== undefined
      ? isWarning
      : Boolean(isActive) &&
        remainingSeconds !== null &&
        remainingSeconds !== undefined &&
        remainingSeconds <= 10 &&
        remainingSeconds > 0;

  if (!isTriggered) {
    return null;
  }

  const seconds = remainingSeconds !== null && remainingSeconds !== undefined ? remainingSeconds : null;
  const isCritical = seconds !== null ? seconds <= 5 : false;

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-40 overflow-hidden select-none transition-opacity duration-300 ${className}`}
      aria-hidden="true"
    >
      {/* 1. Ekran Çevresi Kalın Neon Nabız Çerçevesi & Dramatik Çok Katmanlı Vinyet */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${
          isCritical
            ? 'border-[14px] sm:border-[20px] animate-time-pulse-fast'
            : 'border-[12px] sm:border-[16px] animate-time-pulse-slow'
        }`}
      />

      {/* 2. Dört Köşede Radial Işık Patlaması / Flare */}
      <div
        className={`absolute -top-10 -left-10 w-44 h-44 sm:w-72 sm:h-72 rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.85)_0%,rgba(220,38,38,0.4)_45%,transparent_70%)] pointer-events-none ${
          isCritical ? 'animate-time-corner-flare-fast' : 'animate-time-corner-flare'
        }`}
      />
      <div
        className={`absolute -top-10 -right-10 w-44 h-44 sm:w-72 sm:h-72 rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.85)_0%,rgba(220,38,38,0.4)_45%,transparent_70%)] pointer-events-none ${
          isCritical ? 'animate-time-corner-flare-fast' : 'animate-time-corner-flare'
        }`}
      />
      <div
        className={`absolute -bottom-10 -left-10 w-44 h-44 sm:w-72 sm:h-72 rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.85)_0%,rgba(220,38,38,0.4)_45%,transparent_70%)] pointer-events-none ${
          isCritical ? 'animate-time-corner-flare-fast' : 'animate-time-corner-flare'
        }`}
      />
      <div
        className={`absolute -bottom-10 -right-10 w-44 h-44 sm:w-72 sm:h-72 rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.85)_0%,rgba(220,38,38,0.4)_45%,transparent_70%)] pointer-events-none ${
          isCritical ? 'animate-time-corner-flare-fast' : 'animate-time-corner-flare'
        }`}
      />

      {/* 3. Son 5 Saniyede Şiddetli Kırmızı Flash Strobe */}
      {isCritical && (
        <div className="absolute inset-0 bg-red-600 animate-time-flash-fast pointer-events-none" />
      )}

      {/* 4. Ekranın Üstünde / Ortasında Kalp Atışı Gibi Atan Geri Sayım Rozeti */}
      {showBadge && seconds !== null && seconds > 0 && (
        <div className="absolute top-7 lg:top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div
            className={`flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full font-black tracking-widest text-xs sm:text-sm uppercase backdrop-blur-md shadow-2xl border transition-all ${
              isCritical
                ? 'bg-red-600/95 text-white border-red-300 ring-4 ring-red-500/50 shadow-[0_0_35px_rgba(239,68,68,0.95)] animate-time-badge-critical'
                : 'bg-red-950/90 text-red-200 border-red-500/80 ring-2 ring-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.7)] animate-time-badge-beat'
            }`}
          >
            <span className="flex h-2.5 w-2.5 relative">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span>SON {seconds} SANİYE</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeWarningOverlay;
