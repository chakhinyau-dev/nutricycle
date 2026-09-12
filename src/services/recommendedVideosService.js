import { createClerkSupabaseClient } from '../lib/supabase';
import { getLocalRecommendedVideos, setLocalRecommendedVideos } from './appStorage';

// Local cache is the source of truth that keeps the feature usable offline
// or in demo mode (no real JWT); Supabase is the sync layer on top of it —
// same principle as fastingService.js. Every write updates the local cache
// first, then best-effort syncs to Supabase.
export const loadRecommendedVideoIds = async (getToken, clerkUserId) => {
  const localIds = await getLocalRecommendedVideos(clerkUserId);
  const supabase = createClerkSupabaseClient(getToken);

  if (!supabase || !clerkUserId) {
    return localIds;
  }

  const { data, error } = await supabase
    .from('recommended_videos')
    .select('video_id')
    .eq('clerk_user_id', clerkUserId);

  if (error) {
    console.error('[RecommendedVideos] Error loading:', error.message);
    return localIds;
  }

  const remoteIds = data.map((row) => row.video_id);
  await setLocalRecommendedVideos(clerkUserId, remoteIds);
  return remoteIds;
};

export const addRecommendedVideo = async (getToken, clerkUserId, videoId) => {
  const existing = await getLocalRecommendedVideos(clerkUserId);
  if (!existing.includes(videoId)) {
    await setLocalRecommendedVideos(clerkUserId, [...existing, videoId]);
  }

  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return;

  const { error } = await supabase
    .from('recommended_videos')
    .upsert({ clerk_user_id: clerkUserId, video_id: videoId }, { onConflict: 'clerk_user_id,video_id' });

  if (error) {
    console.error('[RecommendedVideos] Error adding:', error.message);
  }
};

export const removeRecommendedVideo = async (getToken, clerkUserId, videoId) => {
  const existing = await getLocalRecommendedVideos(clerkUserId);
  await setLocalRecommendedVideos(clerkUserId, existing.filter((id) => id !== videoId));

  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase || !clerkUserId) return;

  const { error } = await supabase
    .from('recommended_videos')
    .delete()
    .eq('clerk_user_id', clerkUserId)
    .eq('video_id', videoId);

  if (error) {
    console.error('[RecommendedVideos] Error removing:', error.message);
  }
};
