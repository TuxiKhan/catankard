import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Play,
  PlusCircle,
  LogIn,
  ShieldCheck,
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
}) => {
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
      setError('Lütfen bir oyuncu adı girin.');
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
      setError('Lütfen bir oyuncu adı girin.');
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Dekoratif Arka Plan Parıltısı */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-3 shadow-inner">
            <Sparkles size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
            CATAN · On the Road
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Online Çok Oyunculu Kart Oyunu (3 - 4 Oyuncu)
          </p>
        </div>

        {error && (
          <div className="bg-red-950/60 border border-red-500 rounded-xl p-3 mb-4 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Oyuncu Adı Girişi */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Oyuncu Adınız
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => onUpdatePlayerName(e.target.value)}
            disabled={!!room}
            maxLength={20}
            placeholder="Adınızı girin..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition disabled:opacity-60"
          />
        </div>

        {/* LOBİ BEKLEME ODASI (Odaya katılmışsa) */}
        {room ? (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Oda Kodu Kutusu */}
            <div className="bg-slate-950 border-2 border-dashed border-amber-500/60 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                  Oda Kodu (Arkadaşlarınla Paylaş)
                </span>
                <span className="text-2xl font-black text-white tracking-widest">
                  {room.code}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 px-3 py-2 rounded-xl text-xs font-semibold transition"
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                <span>{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
              </button>
            </div>

            {/* Oyuncu Listesi */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">
                  Katılan Oyuncular ({players.length} / {room.max_players})
                </span>
                <span className="text-[10px] text-amber-400 font-bold">
                  {players.length >= 3 ? 'Başlamaya Hazır' : 'En az 3 oyuncu bekleniyor'}
                </span>
              </div>

              <div className="space-y-2">
                {players.map((p, idx) => (
                  <div
                    key={p.user_id}
                    className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <span className="text-sm font-medium text-slate-200">
                        {p.name} {p.user_id === currentUserId && <span className="text-amber-400 text-xs">(Sen)</span>}
                      </span>
                    </div>

                    {p.is_host && (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                        <ShieldCheck size={12} />
                        Kurucu
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Alt Butonlar */}
            <div className="pt-2 space-y-2">
              {isHost ? (
                <button
                  type="button"
                  onClick={onStartGame}
                  disabled={!canStart || loading}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold rounded-xl transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Play size={18} />
                  <span>{loading ? 'Başlatılıyor...' : 'Oyunu Başlat'}</span>
                </button>
              ) : (
                <div className="text-center text-xs text-slate-400 py-2 italic">
                  Oda kurucusunun oyunu başlatması bekleniyor...
                </div>
              )}

              <button
                type="button"
                onClick={onLeaveRoom}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-red-400 bg-slate-950/50 hover:bg-slate-950 rounded-xl transition"
              >
                Odadan Ayrıl
              </button>
            </div>
          </div>
        ) : (
          /* ODA OLUŞTUR / KATIL SEÇENEKLERİ */
          <div className="space-y-6">
            {/* Odaya Katıl */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs font-bold uppercase text-slate-400 block mb-2">
                Odaya Katıl
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="6 Haneli Kod"
                  maxLength={6}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-center font-bold tracking-widest text-amber-400 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={loading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <LogIn size={16} />
                  <span>Katıl</span>
                </button>
              </div>
            </div>

            {/* Oda Oluştur */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
              <span className="text-xs font-bold uppercase text-slate-400 block">
                Yeni Oda Oluştur
              </span>

              {/* Oyuncu Sayısı */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Kapasite</label>
                <div className="grid grid-cols-2 gap-2">
                  {[3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMaxPlayers(n)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        maxPlayers === n
                          ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {n} Oyuncu
                    </button>
                  ))}
                </div>
              </div>

              {/* Büyükşehir Modu */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Büyükşehir Modu</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetropolisSide('A')}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-left ${
                      metropolisSide === 'A'
                        ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">A Yüzü</div>
                    <div className="text-[10px] opacity-75">Oyuna yeni başladım</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetropolisSide('B')}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-left ${
                      metropolisSide === 'B'
                        ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">B Yüzü</div>
                    <div className="text-[10px] opacity-75">Daha önce oynadım</div>
                  </button>
                </div>
              </div>

              {/* Tur Zamanlayıcısı */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Tur Süresi</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Süresiz', val: null },
                    { label: '60s', val: 60 },
                    { label: '90s', val: 90 },
                    { label: '120s', val: 120 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setTurnTimer(item.val)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                        turnTimer === item.val
                          ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
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
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-extrabold rounded-xl transition shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2"
              >
                <PlusCircle size={18} />
                <span>{loading ? 'Oda Açılıyor...' : 'Oda Oluştur'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
