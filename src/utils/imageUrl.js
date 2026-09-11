/**
 * Requests an appropriately-sized version of a Supabase Storage image
 * instead of always loading the full original. Found via investigating a
 * client report that images in the Menstrual phase of "Alimentos Clave"
 * loaded slowly and sometimes looked unclear/incomplete: cross-checking the
 * real production key_foods rows for that phase showed most food photos
 * were properly resized to 800x800 by the app's own upload pipeline
 * (imagePrep.js), but 10 of the 53 were 2000x2000 (up to 274KB each,
 * ~6x the pixel area) — uploaded through a path that bypassed that resize
 * (e.g. a row added directly in the Supabase dashboard rather than through
 * the Admin picker). On a real device, decoding several of these at once
 * while a virtualized list mounts is slow enough to show as a blank/
 * half-rendered image before it finally pops in.
 *
 * Supabase's storage render/image endpoint resizes on the fly server-side —
 * confirmed live: the same 2000x2000/259KB file above comes back at
 * 200x200/~8KB through this endpoint. Rewriting the URL fixes existing
 * oversized rows retroactively with no data migration, and protects
 * against any future upload that skips the client-side resize, since the
 * app never requests more pixels than it will actually display.
 *
 * No-ops for anything that isn't a Supabase Storage public object URL
 * (the static Unsplash fallback images already carry their own `?w=` size
 * and aren't hosted on Supabase, so there's nothing to rewrite).
 */
export const getResizedImageUrl = (url, { width = 200, height = 200 } = {}) => {
  if (!url || typeof url !== 'string') return url;

  const marker = '/storage/v1/object/public/';
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return url;

  const base = url.slice(0, markerIndex);
  const objectPath = url.slice(markerIndex + marker.length);
  return `${base}/storage/v1/render/image/public/${objectPath}?width=${width}&height=${height}&resize=cover`;
};
