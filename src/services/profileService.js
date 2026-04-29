import { createClerkSupabaseClient } from '../lib/supabase';

export const loadUserProfile = async (getToken, clerkUserId) => {
  const supabase = createClerkSupabaseClient(getToken);

  if (!supabase || !clerkUserId) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('clerk_user_id, full_name, email, current_phase, cycle_length, period_length, last_period_start, is_premium')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] Error loading profile:', error);
    return null;
  }

  if (data) {
    console.log('[Supabase] Profile loaded successfully for user:', clerkUserId);
  } else {
    console.warn('[Supabase] No profile found in DB for user:', clerkUserId);
  }

  return data;
};

export const saveUserProfile = async (getToken, profile) => {
  const supabase = createClerkSupabaseClient(getToken);

  if (!supabase || !profile?.clerk_user_id) {
    return null;
  }

  const payload = {
    clerk_user_id: profile.clerk_user_id,
    full_name: profile.full_name,
    email: profile.email,
    current_phase: profile.current_phase,
    cycle_length: profile.cycle_length,
    period_length: profile.period_length,
    last_period_start: profile.last_period_start,
    is_premium: profile.is_premium ?? false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'clerk_user_id' })
    .select('clerk_user_id, full_name, email, current_phase, cycle_length, period_length, last_period_start, is_premium')
    .single();

  if (error) {
    return null;
  }

  return data;
};
