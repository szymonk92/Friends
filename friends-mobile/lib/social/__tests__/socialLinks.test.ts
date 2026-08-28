import { parseSocialInput, serializeSocialLinks, parseSocialLinksJson } from '../socialLinks';

describe('parseSocialInput — Facebook', () => {
  it('extracts the username from a normal profile URL', () => {
    expect(parseSocialInput('https://facebook.com/zuck').handle).toBe('@zuck');
  });

  it('does not fabricate an "@share" handle from an opaque "Copy link" URL — keeps the URL', () => {
    const r = parseSocialInput('https://www.facebook.com/share/19MaNYwLux/');
    expect(r.handle).toBe('https://www.facebook.com/share/19MaNYwLux');
    expect(r.url).toBe('https://www.facebook.com/share/19MaNYwLux');
    expect(r.platform).toBe('facebook');
  });

  it('does not fabricate an "@share" handle from profile.php links', () => {
    const r = parseSocialInput('https://www.facebook.com/profile.php?id=100001');
    expect(r.handle).toBe('https://www.facebook.com/profile.php');
    expect(r.handle).not.toBe('@profile.php');
  });
});

describe('serializeSocialLinks', () => {
  it('round-trips a Facebook share link (URL stored as the handle)', () => {
    const links = [
      {
        platform: 'facebook' as const,
        handle: 'https://www.facebook.com/share/19MaNYwLux',
        url: 'https://www.facebook.com/share/19MaNYwLux',
      },
    ];
    const json = serializeSocialLinks(links);
    expect(json).not.toBeNull();
    expect(parseSocialLinksJson(json)).toEqual(links);
  });

  it('drops a row with a blank handle', () => {
    expect(serializeSocialLinks([{ platform: 'facebook', handle: '  ' }])).toBeNull();
  });
});
