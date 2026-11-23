import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force';

export const NODE_RADIUS = 26;
const LINK_DISTANCE = 80;
const TICKS = 300;

export type Point = { x: number; y: number };
export type Camera = { x: number; y: number; scale: number };

type SimNode = SimulationNodeDatum & { id: string };

/**
 * Runs the force simulation to completion synchronously and returns final positions.
 * forceX/forceY (not forceCenter) so people without connections stay near the middle
 * instead of being pushed off-screen by the charge force.
 * New nodes get d3's deterministic phyllotaxis start; known nodes keep `prev` positions.
 * ponytail: 300 sync ticks, fine for a few hundred people; move to a worker past ~1k.
 */
export function layoutGraph(
  ids: string[],
  edges: Array<{ source: string; target: string }>,
  width: number,
  height: number,
  prev?: Map<string, Point>
): Map<string, Point> {
  const nodes: SimNode[] = ids.map((id) => ({ id, ...prev?.get(id) }));
  const known = new Set(ids);
  const links = edges
    .filter((e) => known.has(e.source) && known.has(e.target) && e.source !== e.target)
    .map((e) => ({ ...e }));

  forceSimulation(nodes)
    .force('link', forceLink<SimNode, (typeof links)[number] & SimulationNodeDatum>(links as never).id((d) => d.id).distance(LINK_DISTANCE))
    .force('charge', forceManyBody().strength(-220).distanceMax(320))
    .force('x', forceX(width / 2).strength(0.07))
    .force('y', forceY(height / 2).strength(0.07))
    .force('collide', forceCollide(NODE_RADIUS + 14))
    .stop()
    .tick(TICKS);

  return new Map(nodes.map((n) => [n.id, { x: n.x ?? width / 2, y: n.y ?? height / 2 }]));
}

/** Camera that fits all points (plus node radius and label room) into width×height. */
export function fitCamera(points: Point[], width: number, height: number): Camera {
  if (points.length === 0) return { x: 0, y: 0, scale: 1 };
  const pad = NODE_RADIUS + 24; // room for the name label under each node
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  const scale = Math.max(0.35, Math.min(width / (maxX - minX), height / (maxY - minY), 1.4));
  return {
    x: width / 2 - ((minX + maxX) / 2) * scale,
    y: height / 2 - ((minY + maxY) / 2) * scale,
    scale,
  };
}
