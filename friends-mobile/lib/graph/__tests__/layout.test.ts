import { fitCamera, layoutGraph } from '../layout';

describe('layoutGraph', () => {
  const W = 360;
  const H = 450;
  const ids = ['a', 'b', 'c', 'loner1', 'loner2', 'loner3'];
  const edges = [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
    { source: 'a', target: 'missing' }, // dangling edge must be ignored, not crash
  ];

  it('places every node, keeps unconnected people close, fits into the viewport', () => {
    const pos = layoutGraph(ids, edges, W, H);
    expect(pos.size).toBe(ids.length);

    for (const p of pos.values()) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      // forceX/forceY keep isolated nodes within a few hundred px of the centre
      expect(Math.hypot(p.x - W / 2, p.y - H / 2)).toBeLessThan(400);
    }

    const cam = fitCamera([...pos.values()], W, H);
    for (const p of pos.values()) {
      const sx = p.x * cam.scale + cam.x;
      const sy = p.y * cam.scale + cam.y;
      expect(sx).toBeGreaterThanOrEqual(0);
      expect(sx).toBeLessThanOrEqual(W);
      expect(sy).toBeGreaterThanOrEqual(0);
      expect(sy).toBeLessThanOrEqual(H);
    }
  });

  it('connected nodes end up closer than unconnected ones', () => {
    const pos = layoutGraph(ids, edges, W, H);
    const d = (x: string, y: string) =>
      Math.hypot(pos.get(x)!.x - pos.get(y)!.x, pos.get(x)!.y - pos.get(y)!.y);
    expect(d('a', 'b')).toBeLessThan(d('a', 'loner1'));
  });

  it('keeps previous positions as the starting point (stable across filter changes)', () => {
    const first = layoutGraph(ids, edges, W, H);
    const second = layoutGraph(ids, edges, W, H, first);
    expect(Math.abs(second.get('a')!.x - first.get('a')!.x)).toBeLessThan(40);
  });
});
