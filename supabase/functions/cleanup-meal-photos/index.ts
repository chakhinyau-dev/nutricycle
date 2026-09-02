// Runs on a daily schedule (set up via the Supabase Dashboard's own Cron
// Jobs feature — Edge Functions -> this function -> Schedule — not wired
// through pg_cron/pg_net from a migration, deliberately: that would require
// embedding a service-role bearer token directly in a committed SQL file,
// which is a real secret and shouldn't live in git. Scheduling through the
// dashboard lets Supabase handle that authentication itself.
//
// Deleting a meal_logs row after 30 days would be wrong — the food/macro
// data has real value for the AI Chat's personalization context and costs
// nothing to keep. Only the PHOTO is time-limited (a real privacy/storage
// concern), so this removes just the Storage object and clears photo_path,
// leaving the rest of the row intact. Unlike ai_chat_messages (a plain
// Postgres row pg_cron can delete directly), a Storage file has to be
// removed through the Storage API — deleting the storage.objects row via
// raw SQL does not reliably delete the underlying file.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!supabase) {
      throw new Error('Supabase credentials are not configured')
    }

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: expired, error: selectError } = await supabase
      .from('meal_logs')
      .select('id, photo_path')
      .not('photo_path', 'is', null)
      .lt('created_at', cutoff)

    if (selectError) throw selectError
    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ removed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const paths = expired.map((row) => row.photo_path).filter(Boolean)
    const { error: removeError } = await supabase.storage.from('meal-photos').remove(paths)
    if (removeError) throw removeError

    const ids = expired.map((row) => row.id)
    const { error: updateError } = await supabase
      .from('meal_logs')
      .update({ photo_path: null })
      .in('id', ids)
    if (updateError) throw updateError

    return new Response(JSON.stringify({ removed: paths.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[Cleanup Meal Photos] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
