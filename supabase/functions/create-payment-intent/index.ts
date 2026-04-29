import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.19.0?target=deno"

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
console.log("[Stripe Edge] Function version: 2026-04-29-V2 - Fallback Active")
const STRIPE_PUBLISHABLE_KEY = Deno.env.get('STRIPE_PUBLISHABLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PlanKey = 'monthly' | 'annual'
type Action = 'pricing' | 'checkout' | 'finalize'

const normalizeLocale = (locale?: string) => {
  const value = (locale || '').toLowerCase()
  if (value.startsWith('es')) return 'es'
  if (value.startsWith('en')) return 'en'
  return 'auto'
}

const normalizePlanKey = (planKey?: string): PlanKey => {
  const value = String(planKey || '').toLowerCase()
  if (value.includes('monthly')) return 'monthly'
  if (value.includes('annual') || value.includes('yearly')) return 'annual'
  return 'annual'
}

const getLookupKey = (planKey: PlanKey) => {
  if (planKey === 'monthly') {
    return Deno.env.get('STRIPE_MONTHLY_PRICE_LOOKUP_KEY') || 'balance_monthly'
  }

  return Deno.env.get('STRIPE_ANNUAL_PRICE_LOOKUP_KEY') || 'balance_annual'
}

const getDirectPriceId = (planKey: PlanKey) => {
  if (planKey === 'monthly') {
    return Deno.env.get('STRIPE_MONTHLY_PRICE_ID') || ''
  }

  return Deno.env.get('STRIPE_ANNUAL_PRICE_ID') || ''
}

const formatPrice = (price: Stripe.Price) => ({
  id: price.id,
  lookupKey: price.lookup_key || null,
  currency: price.currency,
  unitAmount: price.unit_amount,
  unitAmountDecimal: price.unit_amount_decimal,
  recurring: price.recurring ? {
    interval: price.recurring.interval,
    intervalCount: price.recurring.interval_count,
  } : null,
  productName: typeof price.product === 'object' && price.product ? price.product.name : null,
  productDescription: typeof price.product === 'object' && price.product ? price.product.description : null,
})

const resolvePrice = async (stripe: Stripe, planKey: PlanKey) => {
  try {
    const directPriceId = getDirectPriceId(planKey)
    if (directPriceId) {
      const price = await stripe.prices.retrieve(directPriceId, {
        expand: ['product'],
      })
      return price
    }

    const lookupKey = getLookupKey(planKey)
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
      expand: ['data.product'],
    })

    const price = prices.data[0]
    if (price) {
      return price
    }
  } catch (err) {
    console.warn(`[Stripe Edge] Lookup failed for ${planKey}:`, err.message)
  }

  console.log(`[Stripe Edge] Using fallback/virtual price for ${planKey} as no price was found on Stripe Dashboard.`)
  
  // Return a synthetic price object that we can use with price_data
  const isMonthly = planKey === 'monthly'
  return {
    id: isMonthly ? 'price_virtual_monthly' : 'price_virtual_annual',
    unit_amount: isMonthly ? 999 : 7999, // $9.99 or $79.99
    currency: 'usd',
    recurring: {
      interval: isMonthly ? 'month' : 'year',
      interval_count: 1,
    },
    product: {
      id: isMonthly ? 'prod_virtual_monthly' : 'prod_virtual_annual',
      name: `Nutri Balance ${isMonthly ? 'Monthly' : 'Annual'}`,
      description: `Full access to premium nutrition plans and cycle tracking (${isMonthly ? 'Monthly' : 'Annual'})`,
    },
    lookup_key: isMonthly ? 'balance_monthly' : 'balance_annual',
    metadata: {
      virtual: 'true',
      planKey
    }
  } as unknown as Stripe.Price
}

const buildPricingResponse = async (stripe: Stripe) => {
  const annual = await resolvePrice(stripe, 'annual')
  const monthly = await resolvePrice(stripe, 'monthly')

  return {
    annual: formatPrice(annual),
    monthly: formatPrice(monthly),
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in Supabase Secrets')
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const body = req.method === 'GET'
      ? Object.fromEntries(new URL(req.url).searchParams.entries())
      : await req.json().catch(() => ({}))

    const action = (body.action || 'checkout') as Action
    const planKey = normalizePlanKey(body.planKey)
    const locale = normalizeLocale(body.locale)
    const customerEmail = body.customerEmail || ''
    const customerName = body.customerName || ''
    const isWeb = Boolean(body.isWeb)
    const returnUrl = body.returnUrl || ''
    const metadata = body.metadata || {}

    if (action === 'pricing' || req.method === 'GET') {
      const prices = await buildPricingResponse(stripe)
      return new Response(
        JSON.stringify({ prices }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const price = await resolvePrice(stripe, planKey)
    console.log(`[Stripe Edge] Resolved price ${price.id} for plan ${planKey} (${price.unit_amount} ${price.currency})`)
    
    if (price.unit_amount === null || price.unit_amount === undefined) {
      console.error(`[Stripe Edge] Price ${price.id} is missing an amount. This will cause Stripe to fail.`)
      throw new Error(`The selected plan "${planKey}" does not have a valid price set in Stripe. Please check your Stripe Dashboard.`)
    }

    const planType = planKey === 'annual' ? 'yearly' : 'monthly'

    if (action === 'finalize') {
      const sessionId = body.sessionId
      if (!sessionId) {
        throw new Error('Missing Stripe sessionId')
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      })

      const subscription = typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription, { expand: ['latest_invoice.payment_intent'] })
        : session.subscription

      const sessionPlanKey = normalizePlanKey((session.metadata as Record<string, string> | null)?.planKey || body.planKey)
      const sessionPlanType = sessionPlanKey === 'annual' ? 'yearly' : 'monthly'

      return new Response(
        JSON.stringify({
          customer: typeof session.customer === 'string' ? session.customer : session.customer?.id || '',
          subscriptionId: typeof subscription === 'string' ? subscription : subscription.id,
          status: typeof subscription === 'string' ? 'active' : subscription.status,
          planKey: sessionPlanKey,
          planType: sessionPlanType,
          currentPeriodEnd: typeof subscription === 'string'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(subscription.current_period_end * 1000).toISOString(),
          price: formatPrice(price),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (isWeb) {
      if (!returnUrl) {
        throw new Error('Missing returnUrl for Stripe Checkout')
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
          price.id.startsWith('price_virtual_') ? {
            price_data: {
              currency: price.currency,
              unit_amount: price.unit_amount!,
              recurring: {
                interval: price.recurring?.interval as 'month' | 'year' || 'month',
              },
              product_data: {
                name: (price.product as any)?.name || 'Nutri Subscription',
                description: (price.product as any)?.description || '',
              }
            },
            quantity: 1,
          } : {
            price: price.id,
            quantity: 1,
          },
        ],
        success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${returnUrl}?success=false`,
        customer_email: customerEmail || undefined,
        allow_promotion_codes: true,
        locale,
        subscription_data: {
          metadata: {
            ...metadata,
            planKey,
            planType,
            priceId: price.id,
          },
        },
        metadata: {
          ...metadata,
          planKey,
          planType,
          priceId: price.id,
        },
      })

      return new Response(
        JSON.stringify({
          url: session.url,
          sessionId: session.id,
          publishableKey: STRIPE_PUBLISHABLE_KEY,
          price: formatPrice(price),
          planKey,
          planType,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const customer = await stripe.customers.create({
      email: customerEmail || undefined,
      name: customerName || undefined,
      metadata: {
        ...metadata,
        planKey,
        planType,
        priceId: price.id,
      },
    })

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2023-10-16' }
    )

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        price.id.startsWith('price_virtual_') ? {
          price_data: {
            currency: price.currency,
            unit_amount: price.unit_amount!,
            recurring: {
              interval: price.recurring?.interval as 'month' | 'year' || 'month',
            },
            product_data: {
              name: (price.product as any)?.name || 'Nutri Subscription',
              description: (price.product as any)?.description || '',
            }
          },
        } : {
          price: price.id,
        }
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        ...metadata,
        planKey,
        planType,
        priceId: price.id,
      },
    })

    const latestInvoice: any = subscription.latest_invoice
    const paymentIntent: any = latestInvoice && typeof latestInvoice !== 'string'
      ? latestInvoice.payment_intent
      : null

    if (!paymentIntent || typeof paymentIntent === 'string') {
      throw new Error('Stripe subscription did not include a payment intent')
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        customer: customer.id,
        ephemeralKey: ephemeralKey.secret,
        publishableKey: STRIPE_PUBLISHABLE_KEY,
        subscriptionId: subscription.id,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        price: formatPrice(price),
        planKey,
        planType,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
