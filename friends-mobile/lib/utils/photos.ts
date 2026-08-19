import { db, getCurrentUserId } from '@/lib/db';
import { files } from '@/lib/db/schema';
import { randomUUID } from 'expo-crypto';
import { Paths, File as ExpoFile, Directory } from 'expo-file-system';
import { copyAsync } from 'expo-file-system/legacy';

export interface SavedPhoto {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  filePath: string;
  personId: string | null;
}

function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create();
  return dir;
}

/**
 * Save an image — by local file `sourceUri` (copied) or `base64` (written) — into
 * the app's photos dir and insert a `files` row of type 'profile_photo'.
 *
 * Extracted from the inline copies in `usePhotos.ts` (`useAddPhotoToPerson`,
 * `useTakePhoto`) so the contacts-import path reuses the same pipeline instead
 * of duplicating it a third time.
 *
 * ponytail: the two existing inline copies in usePhotos.ts still work; migrate
 * them to call this helper later — not touching working code in this change.
 */
export async function saveProfileImageFile(opts: {
  sourceUri?: string;
  base64?: string;
  mimeType?: string;
  personId?: string;
}): Promise<SavedPhoto> {
  const userId = await getCurrentUserId();
  const fileId = randomUUID();
  const mimeType = opts.mimeType || 'image/jpeg';
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  const filename = `${fileId}.${extension}`;
  const newFile = new ExpoFile(photosDir(), filename);

  if (opts.sourceUri) {
    // Legacy API, not File.copy(): sourceUri can be a content:// URI (e.g.
    // a contact photo on Android), which the new File API can't read.
    await copyAsync({ from: opts.sourceUri, to: newFile.uri });
  } else if (opts.base64) {
    newFile.create();
    newFile.write(opts.base64, { encoding: 'base64' });
  } else {
    throw new Error('saveProfileImageFile: sourceUri or base64 required');
  }

  const [row] = await db
    .insert(files)
    .values({
      id: fileId,
      userId,
      filename,
      mimeType,
      size: newFile.size || 0,
      filePath: newFile.uri,
      fileType: 'profile_photo',
      personId: opts.personId ?? null,
    })
    .returning();

  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    size: row.size,
    filePath: row.filePath,
    personId: row.personId ?? null,
  };
}