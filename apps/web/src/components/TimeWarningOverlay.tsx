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
      {/* 1. Ekran Çevresi İnce ve Zarif Uyarı Çerçevesi */}
      <div
        className={`absolute inset-0 transition-all duration-300 opacity-65 ${
          isCritical
            ? 'border-[3px] sm:border-[5px] animate-time-pulse-fast'
            : 'border-[2px] sm:border-[4px] animate-time-pulse-slow'
        }`}
      />

      {/* 2. Dört Köşede Hafif Radial Parıltı */}
      <div
        className={`absolute -top-6 -left-6 w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.45)_0%,rgba(220,38,38,0.18)_45%,transparent_70%)] pointer-events-none ${
          isCritical ? 'animate-time-corner-flare-fast' : 'animate-time-corner-flare'
        }`}
      />
      <div
        className={`absolute -top-6 -right-6 w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.45)_0%,rgba(220,38,38,0.18)_45%,transparent_70%)] pointer-events-none ${
          isCritical ? 'animate-time-corner-flare-fast' : 'animate-time-corner-flare'
        }`}
      />
      <div
        className={`absolute -bottom-6 -left-6 w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.45)_0%,rgba(220,38,38,0.18)_45%,transparent_70%)] pointer-events-none ${
          isCritical ? 'animate-time-corner-flare-fast' : 'animate-time-corner-flare'
        }`}
      />
      <div
        className={`absolute -bottom-6 -right-6 w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.45)_0%,rgba(220,38,38,0.18)_45%,transparent_70%)] pointer-events-none ${
          isCritical ? 'animate-time-corner-flare-fast' : 'animate-time-corner-flare'
        }`}
      />

      {/* 3. Ekranın Üstünde Kompakt Geri Sayım Rozeti (Sadece Masaüstünde, Mobilde Üst Rozet Zaten Süreyi Gösterir) */}
      {showBadge && seconds !== null && seconds > 0 && (
        <div className="hidden sm:block absolute top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold tracking-wider text-xs uppercase backdrop-blur-md shadow-lg border transition-all ${
              isCritical
                ? 'bg-red-600/85 text-white border-red-300/80 shadow-[0_0_16px_rgba(239,68,68,0.6)] animate-pulse'
                : 'bg-red-950/80 text-red-200 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
            }`}
          >
            <span className="inline-flex rounded-full h-2 w-2 bg-red-400" />
            <span>SON {seconds} SANİYE</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeWarningOverlay;
