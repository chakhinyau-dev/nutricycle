import { format } from 'date-fns';

import { createClerkSupabaseClient } from '../lib/supabase';
import { getLocalDailyLogs, setLocalDailyLogs } from './appStorage';

const normalizeLog = (log) => {
  const loggedAt = log.logged_at || new Date().toISOString();
  return {
    id: String(log.id || loggedAt || Date.now()),
    clerk_user_id: log.clerk_user_id,
    mood: log.mood || 'neutral',
    symptoms: Array.isArray(log.symptoms) ? log.symptoms : [],
    notes: log.notes || '',
    cycle_day: log.cycle_day || null,
    phase_key: log.phase_key || 'follicular',
    logged_at: loggedAt,
    log_date: log.log_date || format(new Date(loggedAt), 'yyyy-MM-dd'),
  };
};

export const loadDailyLogs = async (getToken, clerkUserId) => {
  const localLogs = await getLocalDailyLogs(clerkUserId);
  const supabase = createClerkSupabaseClient(getToken);

  if (!supabase || !clerkUserId) {
    return localLogs.map(normalizeLog);
  }

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .order('logged_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[Supabase Daily Logs] Query Error:', error.message, error.details);
    return localLogs.map(normalizeLog);
  }

  const normalized = data.map(normalizeLog);
  await setLocalDailyLogs(clerkUserId, normalized);
  return normalized;
};

export const saveDailyLog = async (getToken, clerkUserId, input) => {
  const payload = normalizeLog({
    ...input,
    clerk_user_id: clerkUserId,
    logged_at: input.logged_at || new Date().toISOString(),
  });

  const localLogs = await getLocalDailyLogs(clerkUserId);
  const deduped = [payload, ...localLogs.filter((item) => format(new Date(item.logged_at), 'yyyy-MM-dd') !== format(new Date(payload.logged_at), 'yyyy-MM-dd'))].slice(0, 20);
  await setLocalDailyLogs(clerkUserId, deduped);

  const supabase = createClerkSupabaseClient(getToken);

  if (!supabase || !clerkUserId) {
    return payload;
  }

  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(
      {
        clerk_user_id: clerkUserId,
        mood: payload.mood,
        symptoms: payload.symptoms,
        notes: payload.notes,
        cycle_day: payload.cycle_day,
        phase_key: payload.phase_key,
        logged_at: payload.logged_at,
        log_date: format(new Date(payload.logged_at), 'yyyy-MM-dd'),
      },
      { onConflict: 'clerk_user_id,log_date' }
    )
    .select('*')
    .single();

  if (error) {
    console.error('[Supabase] Error saving daily log:', error);
    return payload;
  }

  return normalizeLog(data);
};

export const deleteDailyLog = async (getToken, clerkUserId, logId, logDate) => {
  const localLogs = await getLocalDailyLogs(clerkUserId);
  const filtered = localLogs.filter((l) => l.id !== logId && l.log_date !== logDate);
  await setLocalDailyLogs(clerkUserId, filtered);

  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return true;

  const { error } = await supabase
    .from('daily_logs')
    .delete()
    .eq('clerk_user_id', clerkUserId)
    .eq('log_date', logDate);

  if (error) {
    console.error('[Supabase] Error deleting log:', error);
    return false;
  }
  return true;
};
