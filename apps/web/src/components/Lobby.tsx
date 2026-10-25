import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Play,
  PlusCircle,
  LogIn,
  Crown,
  Clock,
  Compass,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

interface LobbyProps {
  currentUserId: string;
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  room: any | null;
  players: any[];
  onCreateRoom: (options: {
    maxPlayers: number;
    metropolisSide: 'A' | 'B';
    turnTimerSeconds: number | null;
  }) => Promise<void>;
  onJoinRoom: (code: string) => Promise<void>;
  onStartGame: () => Promise<void>;
  onLeaveRoom: () => Promise<void>;
  onStartDemo?: (count: 3 | 4) => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  currentUserId,
  playerName,
  onUpdatePlayerName,
  room,
  players,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onLeaveRoom,
  onStartDemo,
}) => {
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
  const [joinCode, setJoinCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [metropolisSide, setMetropolisSide] = useState<'A' | 'B'>('A');
  const [turnTimer, setTurnTimer] = useState<number | null>(60);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHost = room?.created_by === currentUserId;
  const canStart = isHost && (players.length === 3 || players.length === 4);

  const handleCopyCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreate = async () => {
    if (!playerName.trim()) {
      setError('Lütfen oyuna başlamadan önce bir isim girin.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await onCreateRoom({
        maxPlayers,
        metropolisSide,
        turnTimerSeconds: turnTimer,
      });
    } catch (err: any) {
      setError(err.message || 'Oda oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!playerName.trim()) {
      setError('Lütfen oyuna başlamadan önce bir isim girin.');
      return;
    }
    if (!joinCode.trim()) {
      setError('Lütfen 6 haneli oda kodunu girin.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await onJoinRoom(joinCode.trim().toUpperCase());
    } catch (err: any) {
      setError(err.message || 'Odaya katılınamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-dvh max-h-dvh bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-3 sm:p-6 font-sans selection:bg-amber-500 selection:text-slate-950 relative overflow-y-auto overflow-x-hidden">
      {/* Yumuşak Catan Renk Atmosferi (Gradient Işıklar) */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-red-700/10 rounded-full blur-3xl pointer-events-none" />

      {/* ÜST BAŞLIK & MARKA */}
      <header className="w-full max-w-lg text-center pt-4 pb-2 z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3 tracking-wide">
          <Compass size={14} className="text-amber-400" />
          <span>CATAN · ON THE ROAD</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Yolculuk Başlıyor
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
          3 veya 4 oyuncuyla, masaüstü kurallarına sadık çevrim içi kart oyunu.
        </p>
      </header>

      {/* ANA KART / PANEL */}
      <main className="w-full max-w-lg bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl z-10">
        {error && (
          <div className="bg-red-950/60 border border-red-500/50 rounded-2xl p-3.5 mb-5 text-xs text-red-200 flex items-center gap-2.5 animate-in fade-in duration-200">
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. KULLANICI İSMİ GİRİŞİ */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Oyuncu Takma Adı
          </label>
          <div className="relative">
            <input
              type="text"
              value={playerName}
              onChange={(e) => onUpdatePlayerName(e.target.value)}
              disabled={!!room}
              maxLength={18}
              placeholder="Adınızı yazın (Örn: Sina)..."
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 transition outline-none disabled:opacity-50"
            />
            {playerName && (
              <span className="absolute right-3.5 top-3.5 text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <Check size={14} /> Hazır
              </span>
            )}
          </div>
        </div>

        {/* 2. DURUM: ODA KURULMUŞ / BEKLEME LOBİSİ */}
        {room ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Oda Kodu Gösterim Kartı */}
            <div className="bg-gradient-to-br from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 block mb-1">
                    Oda Davet Kodu
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-widest font-mono">
                    {room.code}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-md shadow-amber-500/10"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Kopyalandı' : 'Kodu Paylaş'}</span>
                </button>
              </div>
              <div className="text-[11px] text-slate-400 mt-2.5 flex items-center gap-1.5">
                <span>Arkadaşlarınız bu kodla odaya katılabilir.</span>
              </div>
            </div>

            {/* Oyuncular Listesi */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users size={14} /> Masadakiler ({players.length}/{room.max_players})
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  players.length >= 3
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {players.length >= 3 ? 'Başlamaya Hazır' : 'Oyuncu Bekleniyor'}
                </span>
              </div>

              <div className="space-y-2">
                {players.map((p, idx) => {
                  const isCurrent = p.user_id === currentUserId;
                  return (
                    <div
                      key={p.user_id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500/40 text-white'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          p.is_host
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <span className="text-sm font-semibold block leading-tight">
                            {p.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] text-amber-400 font-medium">
                              (Senin Hesabın)
                            </span>
                          )}
                        </div>
                      </div>

                      {p.is_host && (
                        <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                          <Crown size={12} /> Kurucu
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Boş Kalan Koltuklar */}
                {Array.from({ length: room.max_players - players.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-slate-800 text-slate-600 text-xs italic"
                  >
                    <div className="w-8 h-8 rounded-xl border border-dashed border-slate-800 flex items-center justify-center">
                      {players.length + i + 1}
                    </div>
                    <span>Oyuncu bekleniyor...</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Eylemler: Başlat & Ayrıl */}
            <div className="pt-2 space-y-2.5">
              {isHost ? (
                <button
                  type="button"
                  onClick={onStartGame}
                  disabled={!canStart || loading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black rounded-2xl text-sm transition shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Play size={18} />
                  <span>{loading ? 'Oyun Başlatılıyor...' : 'Oyunu Başlat'}</span>
                </button>
              ) : (
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Oda kurucusunun oyunu başlatması bekleniyor...</span>
                </div>
              )}

              <button
                type="button"
                onClick={onLeaveRoom}
                className="w-full py-3 text-xs font-semibold text-slate-400 hover:text-red-400 bg-slate-950/40 hover:bg-slate-950 rounded-2xl transition border border-transparent hover:border-slate-800"
              >
                Odadan Ayrıl
              </button>
            </div>
          </div>
        ) : (
          /* 3. DURUM: ODA KURMA VEYA KATILMA SEKMELERİ */
          <div>
            {/* Sekme Butonları */}
            <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('join')}
                className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'join'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn size={15} />
                <span>Odaya Katıl</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'create'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PlusCircle size={15} />
                <span>Oda Oluştur</span>
              </button>
            </div>

            {/* SEKME 1: ODAYA KATIL */}
            {activeTab === 'join' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    6 Haneli Oda Kodu
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Örn: 7TK49A"
                    maxLength={6}
                    className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl p-4 text-center text-xl font-mono font-black tracking-widest text-amber-400 placeholder-slate-700 outline-none transition"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={loading}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black rounded-2xl text-sm transition shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
                >
                  <ArrowRight size={18} />
                  <span>{loading ? 'Bağlanılıyor...' : 'Odaya Gir'}</span>
                </button>
              </div>
            )}

            {/* SEKME 2: YENİ ODA OLUŞTUR */}
            {activeTab === 'create' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Oyuncu Sayısı */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Oyuncu Kapasitesi
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMaxPlayers(n)}
                        className={`py-3 rounded-2xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                          maxPlayers === n
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Users size={15} />
                        <span>{n} Oyuncu</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Büyükşehir Modu */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Büyükşehir Modu
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setMetropolisSide('A')}
                      className={`p-3 rounded-2xl text-left border transition ${
                        metropolisSide === 'A'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <Layers size={14} className="shrink-0" />
                        <span>Oyuna yeni başladım</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Tüm şehirlere standart bonus
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetropolisSide('B')}
                      className={`p-3 rounded-2xl text-left border transition ${
                        metropolisSide === 'B'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <Sparkles size={14} className="shrink-0" />
                        <span>Deneyimliyim</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Yol & ordu eşitlik avantajları
                      </div>
                    </button>
                  </div>
                </div>

                {/* Tur Süresi */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Tur Başına Süre
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Süresiz', val: null },
                      { label: '60 sn', val: 60 },
                      { label: '90 sn', val: 90 },
                      { label: '120 sn', val: 120 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setTurnTimer(item.val)}
                        className={`py-2.5 rounded-xl text-xs font-semibold border transition ${
                          turnTimer === item.val
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-bold'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black rounded-2xl text-sm transition shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
                >
                  <PlusCircle size={18} />
                  <span>{loading ? 'Oda Kuruluyor...' : 'Odayı Kur ve Başla'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ANINDA TEST / DEMO BUTONLARI */}
        {onStartDemo && !room && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              Hızlı Canlı Test Masaları
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onStartDemo(4)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg border border-emerald-400/40 flex items-center gap-2 transition"
              >
                <span>🎮</span>
                <span>4 Kişilik Masayı Aç (4P Canlı)</span>
              </button>
              <button
                type="button"
                onClick={() => onStartDemo(3)}
                className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg border border-sky-400/40 flex items-center gap-2 transition"
              >
                <span>🎲</span>
                <span>3 Kişilik Masayı Aç (3P Canlı)</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ALT BİLGİ & SÜRÜM */}
      <footer className="text-center text-xs text-slate-500 py-4 z-10 flex items-center gap-2">
        <Shield size={12} className="text-amber-500/70" />
        <span>Catan: On the Road v1.0 · Ponytail Edition</span>
      </footer>
    </div>
  );
};
