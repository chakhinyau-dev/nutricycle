import * as ImageManipulator from 'expo-image-manipulator';

// Admin-picked photos (food/recipe/thumbnail images) come straight from the
// device photo library, often 3000-4000px on a side and several MB — even
// though every place this app displays them is a small thumbnail. The
// ImagePicker `quality` option only controls JPEG compression at whatever
// resolution the photo already is; it doesn't downscale it. Left unresized,
// every admin upload bloats Supabase Storage (and load time in the app) for
// no visual benefit. This resizes + re-compresses before upload.
const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.7;

/**
 * Downscales + re-compresses a picked image so it's reasonable to store and
 * serve as a thumbnail. Accepts an ImagePicker asset ({ uri, width, height,
 * base64, ... }) or a plain uri string; returns the same shape it was given
 * (object in, object out; string in, string out) so callers don't need to
 * change how they read the result. Falls back to the original input if
 * manipulation fails for any reason, so a resize hiccup never blocks an
 * upload outright.
 */
export const prepareImageForUpload = async (input, options = {}) => {
  const maxDimension = options.maxDimension || MAX_DIMENSION;
  const quality = options.quality || JPEG_QUALITY;
  const isStringInput = typeof input === 'string';
  const uri = isStringInput ? input : input?.uri;
  if (!uri) return input;

  try {
    const width = (!isStringInput && input.width) || 0;
    const height = (!isStringInput && input.height) || 0;
    const longEdge = Math.max(width, height);
    const actions = longEdge > maxDimension
      ? [{ resize: width >= height ? { width: maxDimension } : { height: maxDimension } }]
      : [];

    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: !isStringInput && Boolean(input.base64),
    });

    if (isStringInput) return result.uri;
    return {
      ...input,
      uri: result.uri,
      width: result.width,
      height: result.height,
      base64: result.base64 || input.base64,
      mimeType: 'image/jpeg',
    };
  } catch (e) {
    console.warn('[imagePrep] Resize failed, uploading original image:', e?.message);
    return input;
  }
};
