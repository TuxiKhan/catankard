-- Güvenlik Sıkılaştırması (Security Hardening)
-- 1. request_player_id fonksiyonunu güvenli search_path ile güncelle
CREATE OR REPLACE FUNCTION public.request_player_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid TEXT;
  v_jwt_sub TEXT;
  v_header_player_id TEXT;
BEGIN
  BEGIN
    v_uid := auth.uid()::text;
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;

  IF v_uid IS NOT NULL AND v_uid <> '' THEN
    RETURN v_uid;
  END IF;

  BEGIN
    v_jwt_sub := COALESCE(
      current_setting('request.jwt.claims', true)::json->>'player_id',
      current_setting('request.jwt.claims', true)::json->>'sub'
    );
  EXCEPTION WHEN OTHERS THEN
    v_jwt_sub := NULL;
  END;

  IF v_jwt_sub IS NOT NULL AND v_jwt_sub <> '' THEN
    RETURN v_jwt_sub;
  END IF;

  BEGIN
    v_header_player_id := current_setting('request.headers', true)::json->>'x-player-id';
  EXCEPTION WHEN OTHERS THEN
    v_header_player_id := NULL;
  END;

  RETURN v_header_player_id;
END;
$$;

-- 2. Tüm tablolarda Row Level Security (RLS) etkinleştir
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_views ENABLE ROW LEVEL SECURITY;

-- 3. Anon + Authenticated için güvenli okuma politikaları
CREATE POLICY "Public can read rooms"
  ON public.rooms FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can read room_players"
  ON public.room_players FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Players can read own player_view"
  ON public.player_views FOR SELECT
  TO anon, authenticated
  USING (user_id::text = public.request_player_id());
