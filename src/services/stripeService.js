import { Platform } from 'react-native';
import { env } from '../lib/env';

const STRIPE_FUNCTION_URL = `${env.supabaseUrl}/functions/v1/create-payment-intent`;

export const normalizeStripeLocale = (locale) => {
  const value = (locale || '').toLowerCase();
  if (value.startsWith('es')) return 'es';
  if (value.startsWith('en')) return 'en';
  return 'auto';
};

const normalizePlanKey = (planKey) => {
  const value = String(planKey || '').toLowerCase();
  if (value.includes('monthly')) return 'monthly';
  if (value.includes('annual') || value.includes('yearly')) return 'annual';
  return 'annual';
};

const callStripeFunction = async (payload) => {
  try {
    const response = await fetch(STRIPE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.supabaseAnonKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.error) {
      const errorMsg = data.error || `Status ${response.status}`;
      console.error(`[Stripe Service Error] ${errorMsg}`, data);
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error('[Stripe Network Error]:', error);
    throw error;
  }
};

export const fetchSubscriptionPricing = async (locale = 'auto') => {
  const data = await callStripeFunction({
    action: 'pricing',
    locale: normalizeStripeLocale(locale),
    source: Platform.OS,
  });

  return data.prices || {};
};

export const createPaymentIntent = async (options = {}, legacyEmail = '', legacyPlanId = 'annual') => {
  const isObjectOptions = typeof options === 'object' && options !== null;
  const isWeb = Platform.OS === 'web';
  const planKey = normalizePlanKey(
    isObjectOptions ? options.planKey : legacyPlanId
  );
  const customerEmail = isObjectOptions ? options.customerEmail || '' : legacyEmail || '';
  const customerName = isObjectOptions ? options.customerName || '' : '';
  const clerkUserId = isObjectOptions ? options.clerkUserId || '' : '';
  const locale = normalizeStripeLocale(isObjectOptions ? options.locale : 'auto');
  const returnUrl = isWeb
    ? (isObjectOptions && options.returnUrl) || (typeof window !== 'undefined' ? window.location.origin : '')
    : undefined;
  const metadata = {
    planKey,
    planType: planKey === 'annual' ? 'yearly' : 'monthly',
    source: Platform.OS,
    clerkUserId,
    ...(isObjectOptions ? options.metadata || {} : {}),
  };

  console.log(`[Stripe] Requesting ${isWeb ? 'Checkout Session' : 'Subscription PaymentSheet'} for ${planKey}`);

  const data = await callStripeFunction({
    action: 'checkout',
    planKey,
    customerEmail,
    customerName,
    locale,
    isWeb,
    returnUrl,
    metadata,
    priceId: isObjectOptions ? options.priceId : undefined,
  });

  if (isWeb) {
    return {
      url: data.url,
      sessionId: data.sessionId,
      publishableKey: data.publishableKey || env.stripePublishableKey,
      price: data.price,
    };
  }

  return {
    clientSecret: data.clientSecret,
    customer: data.customer,
    ephemeralKey: data.ephemeralKey,
    publishableKey: data.publishableKey || env.stripePublishableKey,
    subscriptionId: data.subscriptionId,
    currentPeriodEnd: data.currentPeriodEnd,
    price: data.price,
    planKey: data.planKey || planKey,
    planType: data.planType || metadata.planType,
  };
};

export const finalizeSubscriptionSession = async ({ sessionId, locale = 'auto' } = {}) => {
  if (!sessionId) {
    throw new Error('Missing Stripe checkout session id');
  }

  return callStripeFunction({
    action: 'finalize',
    sessionId,
    locale: normalizeStripeLocale(locale),
    source: Platform.OS,
  });
};

export const handlePaymentSuccess = async (callback) => {
  if (callback) await callback();
};

export const isNative = Platform.OS !== 'web';
