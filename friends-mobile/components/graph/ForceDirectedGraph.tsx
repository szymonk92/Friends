import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Image,
  Line,
  Skia,
  Text as SkiaText,
  useFont,
  useImage,
  vec,
  type SkFont,
  type SkPath,
} from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { fz } from '@/lib/design/tokens';
import { fitCamera, layoutGraph, NODE_RADIUS, type Camera, type Point } from '@/lib/graph/layout';

const GRAPH_HEIGHT = 450;
const FONT_SIZE = 12;
const INITIALS_FONT_SIZE = 14;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;

export interface GraphConnection {
  id: string;
  person1Id: string;
  person2Id: string;
  status?: string | null;
  strength?: number | null;
  relationshipType?: string | null;
}

interface ForceDirectedGraphProps {
  people: Array<{ id: string; name: string; photoPath?: string | null }>;
  connections: GraphConnection[];
  selectedPersonId: string | null;
  /** True while a finger is on the graph, so the parent can lock its ScrollView (it steals pinch on Android). */
  onTouchingChange?: (touching: boolean) => void;
  onSelectPerson: (personId: string | null) => void;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

// Ended / inactive / ex links are drawn dashed so past relationships read differently.
const isPastLink = (c: GraphConnection) =>
  c.status === 'ended' || c.status === 'inactive' || c.relationshipType === 'ex-partner';

function GraphNode({
  person,
  p,
  isSelected,
  dimmed,
  font,
  initialsFont,
  clipPath,
}: {
  person: { name: string; photoPath?: string | null };
  p: Point;
  isSelected: boolean;
  dimmed: boolean;
  font: SkFont | null;
  initialsFont: SkFont | null;
  clipPath: SkPath;
}) {
  // ponytail: null (not '') so Skia doesn't attempt to decode an empty source.
  const image = useImage(person.photoPath ?? null);
  const label = isSelected ? person.name : firstName(person.name);
  const ini = initials(person.name);
  const labelW = font ? font.measureText(label).width : 0;
  const iniW = initialsFont ? initialsFont.measureText(ini).width : 0;

  return (
    <Group
      transform={[{ translateX: p.x }, { translateY: p.y }, { scale: isSelected ? 1.15 : 1 }]}
      opacity={dimmed ? 0.3 : 1}
    >
      <Circle cx={0} cy={0} r={NODE_RADIUS} color={image ? fz.card : fz.surface} />
      {image ? (
        <Group clip={clipPath}>
          <Image
            image={image}
            x={-NODE_RADIUS}
            y={-NODE_RADIUS}
            width={NODE_RADIUS * 2}
            height={NODE_RADIUS * 2}
            fit="cover"
          />
        </Group>
      ) : initialsFont ? (
        <SkiaText x={-iniW / 2} y={INITIALS_FONT_SIZE / 2 - 1} text={ini} font={initialsFont} color={fz.ink} />
      ) : null}
      <Circle
        cx={0}
        cy={0}
        r={NODE_RADIUS}
        color={fz.ink}
        style="stroke"
        strokeWidth={isSelected ? 3 : 1.5}
      />
      {font && (
        <SkiaText x={-labelW / 2} y={NODE_RADIUS + 16} text={label} font={font} color={fz.ink} />
      )}
    </Group>
  );
}

export default function ForceDirectedGraph({
  people,
  connections,
  selectedPersonId,
  onSelectPerson,
  onTouchingChange,
}: ForceDirectedGraphProps) {
  const font = useFont(require('@/lib/fonts/SpaceGrotesk-VariableFont.ttf'), FONT_SIZE);
  const initialsFont = useFont(require('@/lib/fonts/SpaceGrotesk-VariableFont.ttf'), INITIALS_FONT_SIZE);

  const [width, setWidth] = useState(0);
  const prevPositions = useRef<Map<string, Point>>(new Map());

  // Layout is a pure function of (people, connections, width): no per-tick re-renders,
  // and an empty filter result simply yields an empty map (no stale graph).
  const positions = useMemo(() => {
    if (width === 0) return new Map<string, Point>();
    const next = layoutGraph(
      people.map((p) => p.id),
      connections.map((c) => ({ source: c.person1Id, target: c.person2Id })),
      width,
      GRAPH_HEIGHT,
      prevPositions.current
    );
    prevPositions.current = new Map([...prevPositions.current, ...next]);
    return next;
  }, [people, connections, width]);

  const fit = useMemo(() => fitCamera([...positions.values()], width, GRAPH_HEIGHT), [positions, width]);

  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const cameraRef = useRef(camera);
  const commitCamera = useCallback((next: Camera) => {
    cameraRef.current = next;
    setCamera(next);
  }, []);

  // Refit whenever the visible set changes (filters, search, new people).
  useEffect(() => commitCamera(fit), [fit, commitCamera]);

  // Refs so the gesture object is built once and still reads live values.
  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const fitRef = useRef(fit);
  fitRef.current = fit;
  const selectedRef = useRef(selectedPersonId);
  selectedRef.current = selectedPersonId;
  const onSelectRef = useRef(onSelectPerson);
  onSelectRef.current = onSelectPerson;
  const touchingRef = useRef(onTouchingChange);
  touchingRef.current = onTouchingChange;
  const widthRef = useRef(width);
  widthRef.current = width;

  // Bring the selected node into view if it sits outside the viewport.
  useEffect(() => {
    if (!selectedPersonId) return;
    const p = positionsRef.current.get(selectedPersonId);
    if (!p) return;
    const { scale, x, y } = cameraRef.current;
    const sx = p.x * scale + x;
    const sy = p.y * scale + y;
    const m = NODE_RADIUS * 2;
    const w = widthRef.current;
    if (sx > m && sx < w - m && sy > m && sy < GRAPH_HEIGHT - m) return;
    commitCamera({ x: w / 2 - p.x * scale, y: GRAPH_HEIGHT / 2 - p.y * scale, scale });
  }, [selectedPersonId, commitCamera]);

  const gesture = useMemo(() => {
    const start = { cam: { x: 0, y: 0, scale: 1 }, fx: 0, fy: 0, wx: 0, wy: 0, pinned: false };

    // One finger pans; two fingers are handled entirely by pinch (zoom + move together).
    const pan = Gesture.Pan()
      .runOnJS(true)
      .maxPointers(1)
      .onBegin(() => touchingRef.current?.(true))
      .onFinalize(() => touchingRef.current?.(false))
      .onStart(() => {
        start.cam = { ...cameraRef.current };
      })
      .onUpdate((e) => {
        commitCamera({
          x: start.cam.x + e.translationX,
          y: start.cam.y + e.translationY,
          scale: cameraRef.current.scale,
        });
      });

    // Zoom around the fingers: the world point under the starting focal point
    // stays under the (moving) focal point.
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onBegin(() => touchingRef.current?.(true))
      .onFinalize(() => touchingRef.current?.(false))
      .onStart((e) => {
        start.cam = { ...cameraRef.current };
        // With someone selected, zoom around that person (they stay put on screen);
        // otherwise around the fingers.
        const sel = selectedRef.current ? positionsRef.current.get(selectedRef.current) : undefined;
        if (sel) {
          start.wx = sel.x;
          start.wy = sel.y;
          start.fx = sel.x * start.cam.scale + start.cam.x;
          start.fy = sel.y * start.cam.scale + start.cam.y;
          start.pinned = true;
        } else {
          start.wx = (e.focalX - start.cam.x) / start.cam.scale;
          start.wy = (e.focalY - start.cam.y) / start.cam.scale;
          start.fx = e.focalX;
          start.fy = e.focalY;
          start.pinned = false;
        }
      })
      .onUpdate((e) => {
        const scale = Math.max(MIN_SCALE, Math.min(start.cam.scale * e.scale, MAX_SCALE));
        const fx = start.pinned ? start.fx : e.focalX;
        const fy = start.pinned ? start.fy : e.focalY;
        commitCamera({ x: fx - start.wx * scale, y: fy - start.wy * scale, scale });
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDistance(10)
      .onEnd((e) => {
        const cam = cameraRef.current;
        const wx = (e.x - cam.x) / cam.scale;
        const wy = (e.y - cam.y) / cam.scale;
        // Hit radius in screen pixels, so small zoom levels stay tappable.
        let best: string | null = null;
        let bestDist = (NODE_RADIUS + 8) / Math.min(cam.scale, 1);
        for (const [id, p] of positionsRef.current) {
          const d = Math.hypot(p.x - wx, p.y - wy);
          if (d < bestDist) {
            bestDist = d;
            best = id;
          }
        }
        onSelectRef.current(best === selectedRef.current ? null : best);
      });

    const doubleTap = Gesture.Tap()
      .runOnJS(true)
      .numberOfTaps(2)
      .maxDelay(300)
      .onEnd(() => {
        onSelectRef.current(null);
        commitCamera(fitRef.current);
      });

    return Gesture.Simultaneous(Gesture.Exclusive(doubleTap, tap), pan, pinch);
  }, [commitCamera]);

  const clipPath = useMemo(() => {
    return Skia.Path.Circle(0, 0, NODE_RADIUS - 1);
  }, []);

  const neighborIds = useMemo(() => {
    const s = new Set<string>();
    if (!selectedPersonId) return s;
    for (const c of connections) {
      if (c.person1Id === selectedPersonId) s.add(c.person2Id);
      if (c.person2Id === selectedPersonId) s.add(c.person1Id);
    }
    return s;
  }, [connections, selectedPersonId]);

  // Draw the selected node and its neighbours last so they sit on top.
  const orderedPeople = useMemo(() => {
    if (!selectedPersonId) return people;
    const rank = (id: string) => (id === selectedPersonId ? 2 : neighborIds.has(id) ? 1 : 0);
    return [...people].sort((a, b) => rank(a.id) - rank(b.id));
  }, [people, selectedPersonId, neighborIds]);

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== width) setWidth(w);
      }}
    >
      <GestureDetector gesture={gesture}>
        <View style={styles.canvas}>
          <Canvas style={styles.canvas}>
            <Group transform={[{ translateX: camera.x }, { translateY: camera.y }, { scale: camera.scale }]}>
              {connections.map((c) => {
                const a = positions.get(c.person1Id);
                const b = positions.get(c.person2Id);
                if (!a || !b) return null;
                const active =
                  !!selectedPersonId && (c.person1Id === selectedPersonId || c.person2Id === selectedPersonId);
                const strength = c.strength ?? 0.5;
                return (
                  <Line
                    key={c.id}
                    p1={vec(a.x, a.y)}
                    p2={vec(b.x, b.y)}
                    color={active ? fz.ink : fz.line}
                    style="stroke"
                    strokeWidth={(active ? 1.5 : 0.75) + strength * 2}
                    opacity={selectedPersonId ? (active ? 0.9 : 0.15) : 0.8}
                  >
                    {isPastLink(c) && <DashPathEffect intervals={[6, 5]} />}
                  </Line>
                );
              })}
              {orderedPeople.map((person) => {
                const p = positions.get(person.id);
                if (!p) return null;
                const isSelected = person.id === selectedPersonId;
                return (
                  <GraphNode
                    key={person.id}
                    person={person}
                    p={p}
                    isSelected={isSelected}
                    dimmed={!!selectedPersonId && !isSelected && !neighborIds.has(person.id)}
                    font={font}
                    initialsFont={initialsFont}
                    clipPath={clipPath}
                  />
                );
              })}
            </Group>
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: GRAPH_HEIGHT,
    width: '100%',
    backgroundColor: fz.surfaceSoft,
    borderRadius: fz.rCard,
    overflow: 'hidden',
  },
  canvas: { flex: 1 },
});
