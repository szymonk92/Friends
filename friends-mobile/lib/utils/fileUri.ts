/**
 * iOS moves an app's data container to a new UUID path on every app update or
 * reinstall:
 *
 *   file:///var/mobile/Containers/Data/Application/<OLD-UUID>/Documents/photos/a.jpg
 *
 * The files move with it, but an absolute URI saved in SQLite keeps pointing
 * at the old container, so every stored photo would vanish after an update.
 * Re-roots such a URI onto the current documents directory, keyed on the
 * app-owned sub-directory. Android paths are stable, so this is a no-op there.
 */
export function rebaseDocumentUri(
  storedUri: string,
  documentDirUri: string,
  subdir = 'photos'
): string {
  if (!storedUri.startsWith('file://') || storedUri.startsWith(documentDirUri)) {
    return storedUri;
  }
  const marker = `/${subdir}/`;
  const at = storedUri.lastIndexOf(marker);
  if (at === -1) return storedUri;
  const base = documentDirUri.endsWith('/') ? documentDirUri : `${documentDirUri}/`;
  return `${base}${storedUri.slice(at + 1)}`;
}
