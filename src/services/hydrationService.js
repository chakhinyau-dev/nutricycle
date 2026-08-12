import { format } from 'date-fns';

import { createClerkSupabaseClient } from '../lib/supabase';

const todayDate = () => format(new Date(), 'yyyy-MM-dd');

/**
 * Loads today's hydration row for this user, if one exists yet.
 * Returns null on a new day (no row) or when Supabase isn't reachable —
 * callers should treat null as "start from 0".
 */
export const loadTodayHydration = async (getToken, clerkUserId) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return null;

  const { data, error } = await supabase
    .from('hydration_logs')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('log_date', todayDate())
    .maybeSingle();

  if (error) {
    console.error('[Supabase] Error loading hydration:', error.message);
    return null;
  }

  return data;
};

/**
 * Upserts today's hydration total (one row per user per day, same pattern
 * as dailyLogService's onConflict: 'clerk_user_id,log_date').
 */
export const saveHydration = async (getToken, clerkUserId, amountMl, goalMl, entries = []) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return null;

  const payload = {
    clerk_user_id: clerkUserId,
    log_date: todayDate(),
    amount_ml: Math.max(0, Math.round(amountMl)),
    goal_ml: goalMl || 2500,
    entries,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('hydration_logs')
    .upsert(payload, { onConflict: 'clerk_user_id,log_date' })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error saving hydration:', error.message);
    return null;
  }

  return data;
};
