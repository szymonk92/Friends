import { rebaseDocumentUri } from '../fileUri';

const CURRENT = 'file:///var/mobile/Containers/Data/Application/NEW-UUID/Documents/';

describe('rebaseDocumentUri', () => {
  it('re-roots a photo saved under an old iOS container onto the current one', () => {
    const stale = 'file:///var/mobile/Containers/Data/Application/OLD-UUID/Documents/photos/a.jpg';
    expect(rebaseDocumentUri(stale, CURRENT)).toBe(`${CURRENT}photos/a.jpg`);
  });

  it('leaves a URI already under the current documents directory untouched', () => {
    const fresh = `${CURRENT}photos/a.jpg`;
    expect(rebaseDocumentUri(fresh, CURRENT)).toBe(fresh);
  });

  it('is a no-op for stable Android paths', () => {
    const android = 'file:///data/user/0/com.friendz.app/files/photos/a.jpg';
    expect(rebaseDocumentUri(android, 'file:///data/user/0/com.friendz.app/files/')).toBe(android);
  });

  it('handles a documents URI without a trailing slash', () => {
    const stale = 'file:///var/mobile/Containers/Data/Application/OLD/Documents/photos/b.png';
    expect(rebaseDocumentUri(stale, CURRENT.slice(0, -1))).toBe(`${CURRENT}photos/b.png`);
  });

  it('leaves non-file URIs and files outside the photos dir alone', () => {
    expect(rebaseDocumentUri('content://media/external/images/1', CURRENT)).toBe(
      'content://media/external/images/1'
    );
    expect(rebaseDocumentUri('https://example.com/photos/a.jpg', CURRENT)).toBe(
      'https://example.com/photos/a.jpg'
    );
    const elsewhere = 'file:///var/mobile/Containers/Data/Application/OLD/Library/Caches/a.jpg';
    expect(rebaseDocumentUri(elsewhere, CURRENT)).toBe(elsewhere);
  });
});
