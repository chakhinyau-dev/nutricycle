// Authoritative, server-side source of truth for subscription status.
//
// The client (SubscriptionScreen.js -> App.js's handleUpgrade -> subscriptionService.js's
// recordSubscription) writes to `subscriptions` directly today, which means a user's own
// device is trusted to report its own purchase honestly — nothing stops a user from writing
// status: 'active' to their own row without ever paying. This function closes that gap by
// listening to RevenueCat's server-to-server events (which RevenueCat only sends after
// verifying the purchase with Apple/Google) and writing the same table with the service-role
// key, bypassing RLS entirely.
//
// This does NOT yet replace the client-side write — both write the same table for now
// (the client write remains a fast, optimistic update; this webhook is the durable,
// trustworthy correction). Once this is confirmed reliable in production, a follow-up
// migration can revoke the client's own INSERT/UPDATE policy on `subscriptions` so this
// webhook becomes the *only* writer. See supabase/functions/stripe-webhook/index.ts for the
// equivalent (legacy, unused) pattern this mirrors.
//
// RevenueCat's `app_user_id` is the Clerk user ID directly — the app calls
// `Purchases.logIn(clerkUserId)` (see src/services/revenuecatService.js's configureRevenueCat),
// so no metadata mapping is needed, unlike the old Stripe webhook.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const MONTHLY_PRODUCT_ID = 'com.salatmahenoor.nutricycle.monthly'
const ANNUAL_PRODUCT_ID = 'com.salatmahenoor.nutricycle.annual'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

type RevenueCatEvent = {
  id: string
  type: string
  app_user_id: string
  product_id?: string
  expiration_at_ms?: number | null
  purchased_at_ms?: number | null
  environment?: string
}

const extractPlanType = (productId: string | undefined) => {
  if (!productId) return 'monthly'
  if (productId === ANNUAL_PRODUCT_ID || productId.includes('annual') || productId.includes('year')) return 'yearly'
  if (productId === MONTHLY_PRODUCT_ID || productId.includes('monthly') || productId.includes('month')) return 'monthly'
  return 'monthly'
}

const upsertSubscription = async ({
  clerkUserId,
  status,
  planType,
  currentPeriodEnd,
}: {
  clerkUserId: string
  status: string
  planType: string
  currentPeriodEnd: string | null
}) => {
  if (!supabase || !clerkUserId) {
    return
  }

  const payload = {
    clerk_user_id: clerkUserId,
    status,
    plan_id: planType,
    current_period_end: currentPeriodEnd,
    updated_at: new Date().toISOString(),
  }

  await supabase.from('subscriptions').upsert(payload, { onConflict: 'clerk_user_id' })
  await supabase.from('profiles').update({ is_premium: status === 'active' }).eq('clerk_user_id', clerkUserId)
}

const recordEvent = async (eventId: string, eventType: string) => {
  if (!supabase) {
    return false
  }

  const { data, error } = await supabase
    .from('revenuecat_webhook_events')
    .insert({ id: eventId, event_type: eventType })
    .select('id')
    .maybeSingle()

  if (error) {
    const duplicate = error.code === '23505'
    if (duplicate) return false
    throw error
  }

  return Boolean(data)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!REVENUECAT_WEBHOOK_SECRET || !supabase) {
      throw new Error('RevenueCat webhook secret or Supabase credentials are not configured')
    }

    // RevenueCat sends back exactly the "Authorization header value" string you configure
    // in its dashboard (Project Settings -> Integrations -> Webhooks) — a plain shared-secret
    // comparison, not a signature scheme like Stripe's stripe-signature header.
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    if (authHeader !== REVENUECAT_WEBHOOK_SECRET) {
      throw new Error('Invalid webhook authorization')
    }

    const body = await req.json()
    const event = body?.event as RevenueCatEvent | undefined

    if (!event?.id || !event?.type || !event?.app_user_id) {
      throw new Error('Malformed RevenueCat webhook payload')
    }

    const shouldProcess = await recordEvent(event.id, event.type)
    if (!shouldProcess) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const clerkUserId = event.app_user_id
    const planType = extractPlanType(event.product_id)
    const currentPeriodEnd = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null

    switch (event.type) {
      // Grants or extends access. CANCELLATION is deliberately excluded here — RevenueCat
      // sends it when a user turns off auto-renew, but they keep access until their paid
      // period actually ends (expiration_at_ms), so status should stay 'active' until the
      // matching EXPIRATION event arrives.
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
      case 'PRODUCT_CHANGE':
        await upsertSubscription({ clerkUserId, status: 'active', planType, currentPeriodEnd })
        break

      // Access genuinely ends now.
      case 'EXPIRATION':
        await upsertSubscription({ clerkUserId, status: 'canceled', planType, currentPeriodEnd })
        break

      // Payment retry in progress — flagged, not immediately revoked (mirrors the
      // grace-period handling in the old stripe-webhook for invoice.payment_failed).
      case 'BILLING_ISSUE':
        await upsertSubscription({ clerkUserId, status: 'past_due', planType, currentPeriodEnd })
        break

      // CANCELLATION, SUBSCRIPTION_PAUSED, TRANSFER, and any other event types are
      // acknowledged (200, so RevenueCat doesn't retry) but intentionally not acted on yet.
      default:
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[RevenueCat Webhook] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
