import { createClerkSupabaseClient } from '../lib/supabase';
import { env } from '../lib/env';
import { VIDEO_LIBRARY } from '../utils/videoData';
import { Platform } from 'react-native';
const tus = require('tus-js-client');

export const extractYouTubeId = (url) => {
  if (!url) return '';
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?)|(shorts\/))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[8] && match[8].length === 11) return match[8];
  const directIdMatch = url.match(/(?:shorts\/|v=)([a-zA-Z0-9_-]{11})/);
  if (directIdMatch) return directIdMatch[1];
  return url;
};

const normalizeVideo = (video) => {
  const youtubeUrl = video.youtube_url || video.youtubeUrl || '';
  const videoUrl = video.video_url || video.videoUrl || '';

  return {
    id: String(video.id),
    phaseKey: video.phase_key || video.phaseKey || 'follicular',
    category: video.category || 'General',
    contentType: video.content_type || video.contentType || 'educational',
    title: video.title || 'Untitled',
    description: video.description || '',
    youtubeUrl: youtubeUrl,
    videoUrl: videoUrl,
    isYoutube: Boolean(youtubeUrl && (youtubeUrl.includes('youtu') || youtubeUrl.length === 11)),
    duration: video.duration || '5:00',
    thumbnail: video.thumbnail || (youtubeUrl ? `https://img.youtube.com/vi/${extractYouTubeId(youtubeUrl)}/hqdefault.jpg` : ''),
    mealType: video.meal_type || video.mealType || 'none',
    calories: video.calories || 0,
    youtubeId: extractYouTubeId(youtubeUrl),
    ingredients: Array.isArray(video.ingredients)
      ? video.ingredients
      : (video.ingredients ? String(video.ingredients).split('\n').filter(Boolean) : []),
    instructions: Array.isArray(video.instructions)
      ? video.instructions
      : (video.instructions ? String(video.instructions).split('\n').filter(Boolean) : []),
  };
};

export const loadVideos = async (getToken) => {
  const supabase = createClerkSupabaseClient(getToken);

  if (!supabase) {
    return VIDEO_LIBRARY.map(normalizeVideo);
  }

  const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] Error loading videos:', error.message);
    return VIDEO_LIBRARY;
  }

  const dbVideos = data.map(normalizeVideo);
  
  // Merge DB videos with normalized Library videos, avoiding duplicates by title
  const allVideos = [...dbVideos];
  
  VIDEO_LIBRARY.forEach(libVid => {
    const normalizedLib = normalizeVideo(libVid);
    if (!allVideos.find(v => v.title === normalizedLib.title)) {
        allVideos.push(normalizedLib);
    }
  });

  return allVideos;
};

export const saveVideo = async (getToken, videoData) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase) return null;

  const payload = {
    phase_key: videoData.phase_key || videoData.phaseKey || 'follicular',
    category: videoData.category || 'General',
    title: videoData.title || 'Untitled Video',
    description: videoData.description || '',
    youtube_url: videoData.youtube_url || videoData.youtubeUrl || '',
    video_url: videoData.video_url || videoData.videoUrl || '',
    duration: videoData.duration || '5:00',
    thumbnail: videoData.thumbnail || '',
    meal_type: videoData.meal_type || videoData.mealType || 'none',
    updated_at: new Date().toISOString(),
    ingredients: Array.isArray(videoData.ingredients)
      ? videoData.ingredients
      : (videoData.ingredients ? String(videoData.ingredients).split('\n').filter(Boolean) : []),
    instructions: Array.isArray(videoData.instructions)
      ? videoData.instructions
      : (videoData.instructions ? String(videoData.instructions).split('\n').filter(Boolean) : []),
    calories: parseInt(videoData.calories) || 0,
  };

  console.log('[Supabase Video Save] Payload:', JSON.stringify(payload, null, 2));

  if (videoData.id && !videoData.id.startsWith('temp_') && !isNaN(videoData.id)) {
    // UPDATE
    const { data, error } = await supabase
      .from('videos')
      .update(payload)
      .eq('id', videoData.id)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error updating video:', error.message);
      return null;
    }
    return normalizeVideo(data);
  } else {
    // INSERT
    const { data, error } = await supabase
      .from('videos')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error inserting video:', error.message);
      return null;
    }
    return normalizeVideo(data);
  }
};

export const deleteVideo = async (getToken, videoId) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase) return false;

  const { error } = await supabase.from('videos').delete().eq('id', videoId);

  if (error) {
    console.error('[Supabase] Error deleting video:', error.message);
    return false;
  }

  return true;
};

export const uploadVideoFile = async (getToken, fileUri, fileName, options = {}) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase) return null;

  try {
    const accessToken = await getToken({ template: env.supabaseJwtTemplate || 'supabase' });
    if (!accessToken) {
      throw new Error('Unable to get a Supabase auth token for video upload.');
    }

    const projectUrl = new URL(env.supabaseUrl);
    const projectId = projectUrl.hostname.split('.')[0];
    const endpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
    const objectName = `videos/${Date.now()}_${fileName}`;
    const fileType = fileName.toLowerCase().endsWith('.mov')
      ? 'video/quicktime'
      : fileName.toLowerCase().endsWith('.mkv')
        ? 'video/x-matroska'
        : 'video/mp4';

    const isWeb = Platform.OS === 'web';
    let uploadSource = fileUri;

    if (typeof fileUri === 'string') {
      if (isWeb) {
        const response = await fetch(fileUri);
        uploadSource = await response.blob();
      } else {
        uploadSource = { uri: fileUri };
      }
    } else if (fileUri?.uri && isWeb) {
      const response = await fetch(fileUri.uri);
      uploadSource = await response.blob();
    } else if (fileUri?.uri) {
      uploadSource = { uri: fileUri.uri };
    }

    return await new Promise((resolve, reject) => {
      const upload = new tus.Upload(uploadSource, {
        endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-upsert': 'false',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: 'video-content',
          objectName,
          contentType: fileType,
          cacheControl: '3600',
        },
        chunkSize: 6 * 1024 * 1024,
        onError(error) {
          console.error('[Supabase] Resumable video upload error:', error);
          reject(error);
        },
        onProgress(bytesUploaded, bytesTotal) {
          const percentage = bytesTotal ? (bytesUploaded / bytesTotal) * 100 : 0;
          if (typeof options.onProgress === 'function') {
            options.onProgress(bytesUploaded, bytesTotal, percentage);
          }
        },
        onSuccess() {
          const { data: urlData } = supabase.storage.from('video-content').getPublicUrl(objectName);
          console.log('[Supabase] Video uploaded successfully:', urlData.publicUrl);
          resolve(urlData.publicUrl);
        },
      });

      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      }).catch((error) => {
        console.error('[Supabase] Error starting resumable upload:', error);
        reject(error);
      });
    });
  } catch (err) {
    console.error('[Upload Video] Catch error:', err);
    return null;
  }
};

export const uploadVideoThumbnail = async (getToken, fileUri, fileName) => {
  const supabase = createClerkSupabaseClient(getToken);
  if (!supabase) return null;

  try {
    const fileExt = fileName.split('.').pop() || 'jpg';
    const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
    const path = `thumbnails/${Date.now()}.${fileExt}`;

    let uploadBody;
    if (Platform.OS === 'web') {
      const response = await fetch(fileUri);
      uploadBody = await response.blob();
    } else {
      // fetch(fileUri).blob() is unreliable for local file:// URIs on native
      // (it was silently failing here, leaving the broken local path saved as
      // the thumbnail). Pass the file reference directly instead, same as
      // uploadVideoFile does for the video itself.
      uploadBody = { uri: fileUri, name: fileName, type: contentType };
    }

    const { data, error } = await supabase.storage
      .from('video-content')
      .upload(path, uploadBody, { contentType });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from('video-content').getPublicUrl(data?.path || path);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[Supabase] Video Thumbnail Upload Error:', error);
    return null;
  }
};
