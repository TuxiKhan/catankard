import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-player-id',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization');
    const headerPlayerId = req.headers.get('x-player-id');
    const body = await req.json();

    let userId: string | null = null;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const userClient = createClient(supabaseUrl, authHeader.replace('Bearer ', ''));
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          userId = user.id;
        }
      } catch {}
    }

    if (!userId) {
      userId = headerPlayerId || body.playerId;
    }

    if (!userId) {
      return new Response(JSON.stringify({ ok: false, code: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { roomId } = body;
    if (roomId) {
      await supabase
        .from('room_players')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', userId);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
