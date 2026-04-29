import { createClerkSupabaseClient } from '../lib/supabase';

/**
 * Subscription Service
 * Manages user subscription status and details in the database
 */

export const loadUserSubscription = async (getToken, clerkUserId) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return null;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] Error loading subscription:', error);
    return null;
  }

  // Check if subscription is still valid
  if (data && data.current_period_end) {
    const expiry = new Date(data.current_period_end);
    const now = new Date();
    data.is_expired = now > expiry;
    data.is_active = data.status === 'active' && !data.is_expired;
  }

  return data;
};

export const recordSubscription = async (getToken, clerkUserId, subscriptionData) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return null;

  const payload = {
    clerk_user_id: clerkUserId,
    status: subscriptionData.status || 'premium',
    plan_id: subscriptionData.plan_type || 'monthly',
    stripe_customer_id: subscriptionData.stripe_customer_id || '',
    stripe_subscription_id: subscriptionData.stripe_subscription_id || '',
    current_period_end: subscriptionData.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(payload, { onConflict: 'clerk_user_id' })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error recording subscription:', error);
    return null;
  }

  // Also update the profile is_premium status for convenience
  await supabase
    .from('profiles')
    .update({ is_premium: true })
    .eq('clerk_user_id', clerkUserId);

  return data;
};
