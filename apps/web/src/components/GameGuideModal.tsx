import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  BookOpen,
  Layers,
  Trophy,
  ShieldCheck,
  Coins,
  Hammer,
  ArrowRight,
  Info,
  Sparkles,
  HelpCircle,
  Wheat,
  RotateCcw,
} from 'lucide-react';
import { getCardDetails, type CardDetails } from '../lib/cardImages.ts';

export interface GameGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'rules' | 'cards';
}

type GuideTab = 'rules' | 'cards';
type CardCategoryFilter = 'all' | 'building' | 'metropolis' | 'resource' | 'event' | 'bonus';

interface CardCatalogItem {
  id: string;
  type: any;
  subKind?: any;
  category: CardCategoryFilter;
}

const ALL_CARDS_CATALOG: CardCatalogItem[] = [
  // İnşaat Kartları
  { id: 'road', type: 'road', category: 'building' },
  { id: 'settlement', type: 'settlement', category: 'building' },
  { id: 'city', type: 'city', category: 'building' },
  { id: 'knight', type: 'knight', category: 'building' },

  // Büyükşehir Kartları
  { id: 'metropolis_a', type: 'metropolis', category: 'metropolis' },
  { id: 'metropolis_b_knights', type: 'metropolis', subKind: 'knights', category: 'metropolis' },
  { id: 'metropolis_b_roads', type: 'metropolis', subKind: 'roads', category: 'metropolis' },
  { id: 'metropolis_b_longest_route', type: 'metropolis', subKind: 'longest_route', category: 'metropolis' },
  { id: 'metropolis_b_largest_army', type: 'metropolis', subKind: 'largest_army', category: 'metropolis' },

  // Kaynak Kartları
  { id: 'brick', type: 'brick', category: 'resource' },
  { id: 'wood', type: 'wood', category: 'resource' },
  { id: 'wool', type: 'wool', category: 'resource' },
  { id: 'wheat', type: 'wheat', category: 'resource' },
  { id: 'ore', type: 'ore', category: 'resource' },

  // Olay Kartları
  { id: 'robber', type: 'robber', category: 'event' },
  { id: 'solstice', type: 'solstice', category: 'event' },
  { id: 'abundance', type: 'abundance', category: 'event' },
  { id: 'subsidy', type: 'subsidy', category: 'event' },
  { id: 'charity', type: 'charity', category: 'event' },

  // Bonus Kartları
  { id: 'longest_route', type: 'longest_route', category: 'bonus' },
  { id: 'largest_army', type: 'largest_army', category: 'bonus' },
];

export const GameGuideModal: React.FC<GameGuideModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'rules',
}) => {
  const [activeTab, setActiveTab] = useState<GuideTab>(initialTab);
  const [cardFilter, setCardFilter] = useState<CardCategoryFilter>('all');
  const [selectedZoomCard, setSelectedZoomCard] = useState<CardDetails | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedZoomCard) {
          setSelectedZoomCard(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedZoomCard, onClose]);

  if (!isOpen) return null;

  const filteredCards = ALL_CARDS_CATALOG.filter((item) => {
    if (cardFilter === 'all') return true;
    return item.category === cardFilter;
  }).map((item) => getCardDetails(item.type, item.subKind));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Kart Zoom Büyütme Modalı */}
      {selectedZoomCard && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setSelectedZoomCard(null)}
        >
          <div className="relative max-w-sm sm:max-w-md w-full flex flex-col items-center">
            <img
              src={selectedZoomCard.imageUrl}
              alt={selectedZoomCard.name}
              className="max-h-[75vh] w-auto rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] border-2 border-amber-500/40 animate-in zoom-in-95 duration-150 object-contain"
            />
            <div className="mt-3 px-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-center text-xs text-amber-300">
              Kapatmak için ekrana tıklayın veya ESC&apos;ye basın
            </div>
          </div>
        </div>
      )}

      {/* Ana Rehber Penceresi */}
      <div className="relative w-full max-w-4xl h-[92vh] max-h-[820px] bg-slate-950/95 border border-amber-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Üst Çubuk (Header) */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-800/80 bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 font-black">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-white tracking-wide flex items-center gap-2">
                CATAN: On the Road <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Kılavuz</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Oyun kuralları, kart tanıtımları ve zafer stratejileri
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 p-2 sm:p-2.5 rounded-2xl transition shadow-inner"
            title="Kılavuzu Kapat (ESC)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sekme Butonları (Tabs) */}
        <div className="flex items-center gap-2 px-5 sm:px-8 pt-3 pb-2 border-b border-slate-800/80 bg-slate-900/40">
          <button
            type="button"
            onClick={() => {
              setActiveTab('rules');
              if (contentRef.current) contentRef.current.scrollTop = 0;
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 ${
              activeTab === 'rules'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Nasıl Oynanır? (Kurallar)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('cards');
              if (contentRef.current) contentRef.current.scrollTop = 0;
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 ${
              activeTab === 'cards'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers size={16} />
            <span>Kart Tanıtımları & Detaylar</span>
          </button>
        </div>

        {/* Ana İçerik Alanı */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 space-y-6 custom-scrollbar text-slate-300 text-xs sm:text-sm leading-relaxed">
          {activeTab === 'rules' ? (
            /* ================= NASIL OYNANIR? ================= */
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Hedef & Zafer Şartı */}
              <div className="bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-slate-950 border border-amber-500/30 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm sm:text-base mb-2">
                  <Trophy size={20} className="text-amber-400 shrink-0" />
                  <span>Oyunun Amacı & Zafer Şartı</span>
                </div>
                <p className="text-slate-200 text-xs sm:text-sm">
                  Catan adasında ilk olarak <strong className="text-amber-400 font-black">7 Zafer Puanına (ZP)</strong> ulaşan oyuncu oyunu derhal kazanır!
                  Zafer Puanları kurduğunuz Köyler (1 ZP), Şehirler (2 ZP), Büyükşehirler (3 ZP) ve ele geçireceğiniz Bonus Kartları (En Uzun Yol ve En Güçlü Ordu - her biri 2 ZP) ile toplanır.
                </p>
              </div>

              {/* Başlangıç Düzeni */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm mb-2">
                  <Sparkles size={18} className="shrink-0" />
                  <span>Başlangıç Düzeni (Setup)</span>
                </div>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-xs sm:text-sm">
                  <li>Her oyuncu oyuna <strong>1 Yol ve 1 Köy</strong> kurulu olarak başlar (Herkes 1 ZP ile başlar).</li>
                  <li>Her oyuncuya başlangıçta <strong>3 adet rastgele kaynak kartı</strong> dağıtılır.</li>
                  <li>Masanın ortasında <strong>5 adet açık inşaat kartından oluşan Market (Pazar) sırası</strong> açılır.</li>
                  <li>Masada ayrıca kapalı İnşaat destesi, Kaynak destesi, Olay destesi ve Büyükşehir destesi bulunur.</li>
                </ul>
              </div>

              {/* Tur Fazları */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <ArrowRight size={14} className="text-amber-400" />
                  Bir Turda Neler Olur? (Tur Döngüsü)
                </h3>

                {/* 1. Hasat Fazı */}
                <div className="bg-slate-900/80 border-l-4 border-emerald-500 rounded-r-2xl p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-emerald-400 text-xs sm:text-sm flex items-center gap-1.5">
                      <Wheat size={16} /> 1. Faz: Hasat (Kaynak Çekme)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300/80 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">Otomatik</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Sıra size geldiğinde turunuz başlar başlamaz kaynak destesinden otomatik olarak <strong>1 adet kaynak kartı</strong> çekersiniz.
                    Önünüzde açık duran her <strong>Şehir</strong> için +1 ek kaynak, <strong>Büyükşehir (Taraf A)</strong> varsa fazladan +2 ek kaynak çekersiniz.
                  </p>
                </div>

                {/* 2. Aksiyon Fazı */}
                <div className="bg-slate-900/80 border-l-4 border-amber-500 rounded-r-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-amber-400 text-xs sm:text-sm flex items-center gap-1.5">
                      <Hammer size={16} /> 2. Faz: Aksiyon (Ticaret & İnşaat)
                    </span>
                    <span className="text-[10px] font-mono text-amber-300/80 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">Serbest Sırayla</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Sırası olan oyuncu dilediği sırayla ve kaynakları yettiği sürece aşağıdaki eylemleri yapabilir:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Ticaret */}
                    <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
                      <div className="font-bold text-amber-300 text-xs flex items-center gap-1.5 mb-1">
                        <Coins size={14} /> Oyuncular Arası Takas
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-300">
                        Aktif oyuncu diğer oyunculara takas teklifleri açabilir.
                        <span className="block mt-1 text-emerald-300 font-semibold">
                          ★ Önemli Kural: Sırası olmayan (pasif) bir oyuncu aktif oyuncuyla takas yaparsa, kural kitabı gereği ödül olarak desteden 1 ek bonus kaynak çeker!
                        </span>
                      </p>
                    </div>

                    {/* Yol İkame Oranı */}
                    <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
                      <div className="font-bold text-amber-300 text-xs flex items-center gap-1.5 mb-1">
                        <ArrowRight size={14} /> Yol İkame Oranı (Deste ile Takas)
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-300">
                        Yollarınız sayesinde desteyle indirimli kaynak değiştirebilirsiniz:
                        <br />• <strong>1 Yol:</strong> 4 aynı kaynak = 1 istenen kaynak (4:1)
                        <br />• <strong>2 Yol:</strong> 3:1 takas
                        <br />• <strong>3 Yol:</strong> 2:1 takas
                        <br />• <strong>4+ Yol:</strong> 1:1 takas oranı!
                      </p>
                    </div>
                  </div>

                  {/* İnşa Kuralları */}
                  <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
                    <div className="font-bold text-amber-300 text-xs flex items-center gap-1.5 mb-1">
                      <Hammer size={14} /> Kart İnşa Etme & Yükseltmeler
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] sm:text-xs text-slate-300">
                      <li><strong>Yol & Şövalye:</strong> Boş alana serbestçe kurulur.</li>
                      <li><strong>Köy (1 ZP):</strong> Boş alana kurulur. Kurulduğunda derhal 1 Olay kartı çekilir!</li>
                      <li><strong>Şehir (2 ZP):</strong> Masanızdaki açık bir Köyün üzerine kurulur (Alttaki köy kapanır, net +1 ZP sağlar).</li>
                      <li><strong>Büyükşehir (3 ZP):</strong> Masanızdaki bir Şehrin üzerine kurulur (Şehir kapanır, net +1 ZP sağlar).</li>
                      <li>Marketteki kart alındığı an desteden hemen yerine yeni kart açılır.</li>
                    </ul>
                  </div>
                </div>

                {/* 3. Tur Sonu */}
                <div className="bg-slate-900/80 border-l-4 border-sky-500 rounded-r-2xl p-4">
                  <div className="font-bold text-sky-400 text-xs sm:text-sm mb-1">
                    3. Faz: Tur Sonu
                  </div>
                  <p className="text-slate-300 text-xs">
                    Hamlelerinizi tamamladığınızda &quot;Turu Bitir&quot; butonuna basarsınız ve sıra saat yönünde sonraki oyuncuya geçer.
                  </p>
                </div>
              </div>

              {/* Olay Kartları & Hırsız Uyarısı */}
              <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm mb-2">
                  <HelpCircle size={18} />
                  <span>Olay Kartları ve Hırsız Kuralı</span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm mb-2">
                  Her Köy kurulduğunda bir Olay kartı açılır. Olaylar tüm oyuncuları doğrudan etkiler.
                </p>
                <div className="bg-black/40 border border-red-500/20 p-3 rounded-xl text-xs space-y-1 text-slate-200">
                  <p>
                    <strong className="text-red-400">Hırsız (Robber):</strong> Elinde <span className="text-amber-300 font-bold">7 + sahip olduğu Şövalye sayısından</span> fazla kaynak kartı olan herkes, elindeki kaynakların yarısını (aşağı yuvarlanır) ıskartaya atar.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    * Şövalyeler el güvenliği sağlar: 0 şövalye ile limit 7, 2 şövalye ile limit 9 kaynaktır!
                  </p>
                </div>
              </div>

              {/* Bonus Kartları */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
                  <Trophy size={18} />
                  <span>Bonus Kartları (Her Biri 2 ZP Değerinde)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <strong className="text-amber-300 block mb-1">En Uzun Yol (2 ZP):</strong>
                    İlk olarak en az 3 Yol inşa eden oyuncu kartı alır. Başka bir oyuncu daha fazla yola ulaştığında kart derhal ona geçer.
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <strong className="text-amber-300 block mb-1">En Güçlü Ordu (2 ZP):</strong>
                    İlk olarak en az 2 Şövalye inşa eden oyuncu kartı alır. Başka bir oyuncu daha fazla şövalyeye ulaştığında kart derhal ona geçer.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= KART TANITIMLARI ================= */
            <div className="space-y-5">
              {/* Kategori Filtresi */}
              <div className="flex flex-wrap items-center gap-1.5 pb-2">
                {[
                  { id: 'all', label: 'Tüm Kartlar' },
                  { id: 'building', label: 'İnşaat' },
                  { id: 'metropolis', label: 'Büyükşehir' },
                  { id: 'resource', label: 'Kaynaklar' },
                  { id: 'event', label: 'Olaylar' },
                  { id: 'bonus', label: 'Bonus' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCardFilter(tab.id as CardCategoryFilter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      cardFilter === tab.id
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Kart Listesi / Izgarası */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCards.map((card, idx) => (
                  <div
                    key={`${card.name}-${idx}`}
                    className="bg-slate-900/70 border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-3.5 sm:p-4 flex gap-3.5 items-start transition-all duration-200 group shadow-md"
                  >
                    {/* Kart Görseli */}
                    <div
                      className="relative w-20 sm:w-24 shrink-0 rounded-xl overflow-hidden border border-slate-700/80 shadow-md cursor-pointer group-hover:scale-105 transition-transform"
                      onClick={() => setSelectedZoomCard(card)}
                      title="Büyütmek için tıklayın"
                    >
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                        Büyüt 🔍
                      </div>
                    </div>

                    {/* Kart Bilgileri */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4 className="font-bold text-white text-xs sm:text-sm truncate">
                            {card.name}
                          </h4>
                          {card.vp !== undefined && card.vp > 0 && (
                            <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              +{card.vp} ZP
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-medium text-amber-400/90 mb-1.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>{card.category}</span>
                        </div>

                        {card.cost && (
                          <div className="text-[11px] text-slate-300 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800 mb-2">
                            <span className="text-slate-400 font-semibold">Maliyet:</span> {card.cost}
                          </div>
                        )}

                        <p className="text-[11px] sm:text-xs text-slate-300 leading-snug">
                          {card.description}
                        </p>
                      </div>

                      {card.effect && (
                        <div className="mt-2 text-[10px] sm:text-[11px] font-medium text-emerald-300/90 bg-emerald-950/40 border border-emerald-500/20 px-2 py-1 rounded-lg">
                          ⚡ <strong>Etki:</strong> {card.effect}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Alt Çubuk (Footer) */}
        <div className="px-5 sm:px-8 py-3.5 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-amber-400" />
            <span>Kartları büyütmek için üzerlerine tıklayabilirsiniz.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
};
