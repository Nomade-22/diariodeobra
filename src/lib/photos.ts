/**
 * Resolve a stored `registros.foto_*_key` value to something an <img> can load.
 *
 * Uploads now go through the platform upload endpoint and come back as public
 * URLs, which are stored verbatim. Rows migrated from the old Cloudflare R2
 * bucket still hold bare object keys (e.g. `registros/17736…jpg`); those keep
 * going through /api/files/, which is the only place that knows how to (try to)
 * resolve them.
 */
export function resolvePhotoSrc(photoKey: string): string {
  return /^https?:\/\//i.test(photoKey) ? photoKey : `/api/files/${photoKey}`;
}
