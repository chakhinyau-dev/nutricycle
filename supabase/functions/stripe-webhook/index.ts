import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import Stripe from "https://esm.sh/stripe@14.19.0?target=deno"

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

const upsertSubscription = async ({
  clerkUserId,
  stripeCustomerId,
  stripeSubscriptionId,
  status,
  planType,
  currentPeriodEnd,
}: {
  clerkUserId: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  status: string
  planType?: string
  currentPeriodEnd?: string
}) => {
  if (!supabase || !clerkUserId) {
    return
  }

  const payload = {
    clerk_user_id: clerkUserId,
    status,
    plan_id: planType || 'monthly',
    stripe_customer_id: stripeCustomerId || '',
    stripe_subscription_id: stripeSubscriptionId || '',
    current_period_end: currentPeriodEnd || null,
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
    .from('stripe_webhook_events')
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

const extractPlanType = (metadata: Record<string, string> | undefined | null) => {
  const planType = String(metadata?.planType || '').toLowerCase()
  if (planType.includes('year')) return 'yearly'
  if (planType.includes('month')) return 'monthly'
  const planKey = String(metadata?.planKey || '').toLowerCase()
  if (planKey.includes('annual') || planKey.includes('year')) return 'yearly'
  return 'monthly'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!stripe || !STRIPE_WEBHOOK_SECRET || !supabase) {
      throw new Error('Stripe or Supabase webhook secrets are not configured')
    }

    const signature = req.headers.get('stripe-signature')
    const payload = await req.text()

    if (!signature) {
      throw new Error('Missing Stripe signature header')
    }

    const event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET)

    const shouldProcess = await recordEvent(event.id, event.type)
    if (!shouldProcess) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const metadata = (session.metadata || {}) as Record<string, string>
        const clerkUserId = metadata.clerkUserId
        const planType = extractPlanType(metadata)

        let subscriptionId = ''
        let currentPeriodEnd = ''
        let stripeCustomerId = ''

        if (session.customer) {
          stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer.id
        }

        if (session.subscription && stripe) {
          const subscription = typeof session.subscription === 'string'
            ? await stripe.subscriptions.retrieve(session.subscription)
            : session.subscription
          subscriptionId = typeof subscription === 'string' ? subscription : subscription.id
          currentPeriodEnd = typeof subscription === 'string'
            ? ''
            : new Date(subscription.current_period_end * 1000).toISOString()
        }

        await upsertSubscription({
          clerkUserId,
          stripeCustomerId,
          stripeSubscriptionId: subscriptionId,
          status: 'active',
          planType,
          currentPeriodEnd,
        })
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id || ''
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || ''
        const subscription = subscriptionId && stripe ? await stripe.subscriptions.retrieve(subscriptionId) : null
        const metadata = ((subscription as Stripe.Subscription | null)?.metadata || {}) as Record<string, string>
        const clerkUserId = metadata.clerkUserId
        const planType = extractPlanType(metadata)

        if (clerkUserId) {
          await upsertSubscription({
            clerkUserId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: 'active',
            planType,
            currentPeriodEnd: subscription ? new Date(subscription.current_period_end * 1000).toISOString() : undefined,
          })
        }
        break
      }

      case 'invoice.payment_failed':
      case 'customer.subscription.deleted': {
        const subscriptionEvent = event.data.object as Stripe.Subscription | Stripe.Invoice
        const subscriptionId = 'subscription' in subscriptionEvent
          ? (typeof subscriptionEvent.subscription === 'string' ? subscriptionEvent.subscription : subscriptionEvent.subscription?.id || '')
          : (subscriptionEvent as Stripe.Subscription).id
        const subscription = stripe && subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null
        const metadata = (subscription?.metadata || {}) as Record<string, string>
        const clerkUserId = metadata.clerkUserId

        if (clerkUserId) {
          await upsertSubscription({
            clerkUserId,
            stripeCustomerId: typeof subscription?.customer === 'string' ? subscription.customer : subscription?.customer?.id || '',
            stripeSubscriptionId: subscriptionId,
            status: event.type === 'customer.subscription.deleted' ? 'canceled' : 'past_due',
            planType: extractPlanType(metadata),
            currentPeriodEnd: subscription ? new Date(subscription.current_period_end * 1000).toISOString() : undefined,
          })
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
