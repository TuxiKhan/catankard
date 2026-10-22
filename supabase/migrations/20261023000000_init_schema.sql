-- CATAN – On the Road · Veritabanı Şeması (v1.0)
-- Mimari sözleşmesi: docs/ARCHITECTURE.md

-- Eski tablolar varsa temizle
drop table if exists public.player_views cascade;
drop table if exists public.game_states cascade;
drop table if exists public.room_players cascade;
drop table if exists public.rooms cascade;

-- 1. Odalar (Rooms) Tablosu
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code varchar(6) not null unique,
  status varchar(20) not null default 'lobby' check (status in ('lobby', 'playing', 'finished', 'abandoned')),
  created_by uuid not null default auth.uid(),
  max_players smallint not null default 4 check (max_players in (3, 4)),
  metropolis_side varchar(1) not null default 'A' check (metropolis_side in ('A', 'B')),
  turn_timer_seconds smallint check (turn_timer_seconds in (60, 90, 120) or turn_timer_seconds is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_rooms_code on public.rooms(code);
create index idx_rooms_status on public.rooms(status);

-- 2. Oda Oyuncuları (Room Players) Tablosu
create table public.room_players (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  name varchar(50) not null,
  seat_index smallint not null check (seat_index >= 0 and seat_index < 4),
  is_host boolean not null default false,
  last_seen_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  unique (room_id, seat_index)
);

create index idx_room_players_user on public.room_players(user_id);
create index idx_room_players_room on public.room_players(room_id);

-- 3. Oyun Durumu (Game States) Tablosu - YALNIZCA SUNUCU / SERVICE ROLE ERİŞİR
create table public.game_states (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  state jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

-- 4. Oyuncu Görünümü (Player Views) Tablosu - Realtime ile istemciye aktarılır
create table public.player_views (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null,
  view jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index idx_player_views_user on public.player_views(user_id);

-- RLS (Row Level Security) Etkinleştirme
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.game_states enable row level security;
alter table public.player_views enable row level security;

-- Rooms RLS Politikaları
create policy "Authenticated users can read rooms"
  on public.rooms for select
  to authenticated
  using (true);

create policy "Authenticated users can insert rooms"
  on public.rooms for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Room host can update room in lobby"
  on public.rooms for update
  to authenticated
  using (auth.uid() = created_by);

-- Room Players RLS Politikaları
create policy "Authenticated users can read room_players"
  on public.room_players for select
  to authenticated
  using (true);

create policy "Users can insert their own room_players"
  on public.room_players for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own room_players"
  on public.room_players for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their own room_players"
  on public.room_players for delete
  to authenticated
  using (auth.uid() = user_id);

-- Game States RLS Politikaları: İSTEMCİYE TÜM ERİŞİM KAPALIDIR (Yalnızca Service Role)
-- Politika tanımlanmadığı için authenticated kullanıcılara varsayılan olarak kapalıdır.

-- Player Views RLS Politikaları: Yalnızca kendi görünümünü okuyabilir
create policy "Users can read own player_view"
  on public.player_views for select
  to authenticated
  using (auth.uid() = user_id);

-- Realtime yayınına ekle
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.player_views;
