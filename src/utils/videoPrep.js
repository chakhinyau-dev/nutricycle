import { Platform } from 'react-native';
// See recipeService.js — expo-file-system's main entrypoint (SDK 54 / v19)
// throws on the classic getInfoAsync API; the legacy submodule keeps the
// same signature.
import * as FileSystem from 'expo-file-system/legacy';
import { Video as VideoCompressor } from 'react-native-compressor';

// Admin-uploaded videos are picked straight from the phone's camera roll at
// full quality — commonly 50-200+ MB for a few minutes of footage — and
// uploaded to Supabase Storage as-is, which just serves the raw file back
// with no adaptive streaming. That combination is a well-known cause of
// stuttering/buffering on mobile connections. This re-encodes the video
// on-device before upload — the video equivalent of imagePrep.js's resize
// step for photos, just via native compression instead of a resize.
//
// Native-only: there is no web implementation of the underlying compressor,
// so this is a no-op on web (matches how uploadVideoFile already branches
// by platform).
const MIN_SIZE_TO_COMPRESS_MB = 8;

/**
 * Compresses a picked video asset before upload. Accepts an ImagePicker
 * asset ({ uri, fileSize, ... }); returns the same shape with `uri` and
 * `fileSize` updated to the compressed file. Skips compression for small
 * files (not worth the time) and falls back to the original asset if
 * compression fails for any reason, so this can never block an upload
 * outright.
 */
export const prepareVideoForUpload = async (asset, { onProgress } = {}) => {
  if (!asset?.uri || Platform.OS === 'web') return asset;

  const sizeInMB = asset.fileSize ? asset.fileSize / (1024 * 1024) : 0;
  if (sizeInMB > 0 && sizeInMB < MIN_SIZE_TO_COMPRESS_MB) return asset;

  try {
    const compressedUri = await VideoCompressor.compress(
      asset.uri,
      { compressionMethod: 'auto' },
      (progress) => {
        if (typeof onProgress === 'function') onProgress(progress);
      }
    );

    let fileSize = asset.fileSize;
    try {
      const info = await FileSystem.getInfoAsync(compressedUri, { size: true });
      if (info?.exists && typeof info.size === 'number') fileSize = info.size;
    } catch (e) {
      console.warn('[videoPrep] Could not read compressed file size:', e?.message);
    }

    return { ...asset, uri: compressedUri, fileSize };
  } catch (e) {
    console.warn('[videoPrep] Compression failed, uploading original video:', e?.message);
    return asset;
  }
};
