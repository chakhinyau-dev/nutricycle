import { createClerkSupabaseClient } from '../lib/supabase';
import { getLocalFastingHistory, setLocalFastingHistory } from './appStorage';

const normalizeFastingLog = (row) => ({
  id: String(row.id),
  clerkUserId: row.clerk_user_id,
  startAt: row.start_at,
  endAt: row.end_at,
  goalHours: Number(row.goal_hours) || 0,
  actualHours: row.actual_hours != null ? Number(row.actual_hours) : null,
  phaseKey: row.phase_key,
  createdAt: row.created_at,
});

export const getActiveFast = async (getToken, clerkUserId) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return null;

  const { data, error } = await supabase
    .from('fasting_logs')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .is('end_at', null)
    .order('start_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Fasting] Error loading active fast:', error.message);
    return null;
  }
  return data ? normalizeFastingLog(data) : null;
};

// Falls back to a locally-generated record (id prefixed "local_") whenever
// Supabase can't be reached or RLS rejects the write — same principle as
// dailyLogService.js's saveDailyLog: the local cache is always the thing
// that keeps the feature usable (demo mode, offline, a lapsed session),
// Supabase is the sync layer on top of it, not a hard requirement.
export const startFast = async (getToken, clerkUserId, { goalHours, phaseKey }) => {
  const startAt = new Date().toISOString();
  const supabase = createClerkSupabaseClient(getToken);

  if (supabase && clerkUserId) {
    const { data, error } = await supabase
      .from('fasting_logs')
      .insert({
        clerk_user_id: clerkUserId,
        start_at: startAt,
        goal_hours: goalHours,
        phase_key: phaseKey,
      })
      .select('*')
      .single();

    if (!error && data) {
      return normalizeFastingLog(data);
    }
    console.error('[Fasting] Error starting fast, falling back to local record:', error?.message);
  }

  return {
    id: `local_${Date.now()}`,
    clerkUserId,
    startAt,
    endAt: null,
    goalHours,
    actualHours: null,
    phaseKey,
    createdAt: startAt,
  };
};

// actual_hours is derived from the fast's own start_at, not from a
// client-side elapsed counter, so it stays correct even if the device
// clock drifted or the app was closed and reopened mid-fast.
export const endFast = async (getToken, clerkUserId, fastId, startAt, fallbackFields = {}) => {
  const endAt = new Date();
  const actualHours = Math.max(0, (endAt.getTime() - new Date(startAt).getTime()) / (1000 * 60 * 60));
  const isLocalOnly = String(fastId).startsWith('local_');

  const supabase = createClerkSupabaseClient(getToken);
  if (supabase && !isLocalOnly) {
    const { data, error } = await supabase
      .from('fasting_logs')
      .update({ end_at: endAt.toISOString(), actual_hours: actualHours })
      .eq('id', fastId)
      .eq('clerk_user_id', clerkUserId)
      .select('*')
      .single();

    if (!error && data) {
      const completed = normalizeFastingLog(data);
      await appendToLocalHistory(clerkUserId, completed);
      return completed;
    }
    console.error('[Fasting] Error ending fast, falling back to local record:', error?.message);
  }

  const completed = {
    id: fastId,
    clerkUserId,
    startAt,
    endAt: endAt.toISOString(),
    goalHours: fallbackFields.goalHours ?? null,
    actualHours,
    phaseKey: fallbackFields.phaseKey ?? null,
    createdAt: startAt,
  };
  await appendToLocalHistory(clerkUserId, completed);
  return completed;
};

const appendToLocalHistory = async (clerkUserId, completedFast) => {
  const existing = await getLocalFastingHistory(clerkUserId);
  const updated = [completedFast, ...existing.filter((log) => log.id !== completedFast.id)].slice(0, 30);
  await setLocalFastingHistory(clerkUserId, updated);
};

export const loadFastingHistory = async (getToken, clerkUserId, limit = 30) => {
  const localHistory = await getLocalFastingHistory(clerkUserId);
  const supabase = createClerkSupabaseClient(getToken);

  if (!supabase || !clerkUserId) {
    return localHistory;
  }

  const { data, error } = await supabase
    .from('fasting_logs')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .not('end_at', 'is', null)
    .order('start_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Fasting] Error loading fasting history:', error.message);
    return localHistory;
  }

  const remoteHistory = data.map(normalizeFastingLog);
  // Merge in any locally-cached fasts Supabase doesn't know about yet
  // (written while offline/unauthenticated), newest first.
  const remoteIds = new Set(remoteHistory.map((log) => log.id));
  const merged = [...remoteHistory, ...localHistory.filter((log) => !remoteIds.has(log.id))]
    .sort((a, b) => new Date(b.startAt) - new Date(a.startAt))
    .slice(0, limit);

  await setLocalFastingHistory(clerkUserId, merged);
  return merged;
};

export const deleteFastingLog = async (getToken, clerkUserId, fastId) => {
  const existing = await getLocalFastingHistory(clerkUserId);
  await setLocalFastingHistory(clerkUserId, existing.filter((log) => log.id !== fastId));

  if (String(fastId).startsWith('local_')) {
    return true;
  }

  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase) return true;

  const { error } = await supabase.from('fasting_logs').delete().eq('id', fastId);
  if (error) {
    console.error('[Fasting] Error deleting fasting log:', error.message);
    return false;
  }
  return true;
};
