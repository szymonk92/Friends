import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, ActivityIndicator, View, StyleSheet } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Image,
  Text as SkiaText,
  useFont,
  useImage,
  vec,
  Skia,
  Line,
} from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as d3 from 'd3-force';
import { fz } from '@/lib/design/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRAPH_HEIGHT = 450;

// --- CONFIGURATION ---
const NODE_RADIUS = 28;
const STROKE_WIDTH = 3;
const IMAGE_SIZE = NODE_RADIUS * 2;
const FONT_SIZE = 12;
const TITLE_FONT_SIZE = 14;

const MANY_BODY_STRENGTH = -150;
const COLLISION_RADIUS = NODE_RADIUS + 5;
const LINK_DISTANCE = 70;
const CENTER_FORCE = 0.1;

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  photoPath?: string | null;
  relationshipType?: string | null;
  color: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  id: string;
  source: string | Node;
  target: string | Node;
}

interface ForceDirectedGraphProps {
  people: Array<{
    id: string;
    name: string;
    photoPath?: string | null;
    relationshipType?: string | null;
  }>;
  connections: Array<{ id: string; person1Id: string; person2Id: string }>;
  selectedPersonId: string | null;
  onSelectPerson: (personId: string | null) => void;
}

// Helper to check if d3 has resolved the node link references yet
const isNode = (n: string | Node): n is Node => {
  return typeof n !== 'string' && n.x !== undefined;
};

// --- SUB-COMPONENT FOR INDIVIDUAL NODE RENDERING ---
const GraphNode = ({
  node,
  x,
  y,
  isSelected,
  isNeighbor,
  font,
  titleFont,
  clipPath,
}: {
  node: Node;
  x: number;
  y: number;
  isSelected: boolean;
  isNeighbor: boolean;
  font: any;
  titleFont: any;
  clipPath: any;
}) => {
  // ponytail: null (not '') so Skia doesn't attempt to decode an empty source.
  const image = useImage(node.photoPath ?? null);
  const shouldShowLabel = isSelected || isNeighbor;

  const opacity = isSelected || isNeighbor ? 1 : 0.6;
  const scale = isSelected ? 1.2 : 1;

  // Measure the label so it centers on the node instead of the old length*3.5 hack.
  const labelOffsetX = font ? -font.measureText(node.name).width / 2 : 0;

  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: scale }]} opacity={opacity}>
      {/* 1. Node Circle Background (White filler) */}
      <Circle cx={0} cy={0} r={NODE_RADIUS} color="#ffffff" style="fill" />

      {/* 2. Avatar Image OR Initials */}
      {image ? (
        // Use Group clipping instead of boolean prop
        <Group clip={clipPath}>
          <Image
            image={image}
            x={-NODE_RADIUS}
            y={-NODE_RADIUS}
            width={IMAGE_SIZE}
            height={IMAGE_SIZE}
            fit="cover"
          />
        </Group>
      ) : titleFont ? (
        <SkiaText
          x={-8}
          y={TITLE_FONT_SIZE / 2 - 2}
          text={node.name.substring(0, 2).toUpperCase()}
          font={titleFont}
          color={node.color}
          opacity={1}
        />
      ) : null}

      {/* 3. Node Border */}
      <Circle
        cx={0}
        cy={0}
        r={NODE_RADIUS}
        color={node.color}
        style="stroke"
        strokeWidth={STROKE_WIDTH}
      />

      {/* 4. Label */}
      {shouldShowLabel && font && (
        <Group transform={[{ translateY: NODE_RADIUS + 18 }]}>
          <SkiaText
            x={labelOffsetX}
            y={0}
            text={node.name}
            font={font}
            color={fz.ink}
            opacity={1}
          />
        </Group>
      )}
    </Group>
  );
};

// --- MAIN COMPONENT ---
export default function ForceDirectedGraph({
  people,
  connections,
  selectedPersonId,
  onSelectPerson,
}: ForceDirectedGraphProps) {
  const font = useFont(require('@/lib/fonts/SpaceGrotesk-VariableFont.ttf'), FONT_SIZE);
  const titleFont = useFont(require('@/lib/fonts/SpaceGrotesk-VariableFont.ttf'), TITLE_FONT_SIZE);

  // DEBUG: proves whether Metro is serving this instrumented source or a stale bundle.
  useEffect(() => {
    console.warn('[FDG] mount — instrumented build');
  }, []);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);

  // Refs mirror state so gesture handlers can read live values without rebuilding
  // the gesture on every simulation tick (which would tear down + rebuild it ~60x/s).
  const nodesRef = useRef<Node[]>([]);
  const linksRef = useRef<Link[]>([]);
  const cameraRef = useRef({ x: 0, y: 0, scale: 1 });
  const selectedPersonIdRef = useRef<string | null>(selectedPersonId);
  const onSelectPersonRef = useRef(onSelectPerson);

  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const startCamera = useRef({ x: 0, y: 0, scale: 1 });

  // Live container width via onLayout instead of the stale module-load SCREEN_WIDTH.
  const [layoutWidth, setLayoutWidth] = useState(SCREEN_WIDTH);
  const layoutRef = useRef(SCREEN_WIDTH);

  const commitCamera = useCallback((next: { x: number; y: number; scale: number }) => {
    cameraRef.current = next;
    setCamera(next);
  }, []);

  // Create a reusable path for clipping circles
  const circleClipPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(0, 0, NODE_RADIUS - 1); // Slightly smaller to avoid jagged edges at border
    return path;
  }, []);

  // --- 1. SETUP SIMULATION ---
  useEffect(() => {
    if (!people.length) return;

    const w = layoutWidth;

    // Initialize Nodes, preserving last simulated positions for people still present.
    const newNodes: Node[] = people.map((p) => {
      const existing = nodesRef.current.find((n) => n.id === p.id);
      return {
        ...p,
        x: existing?.x ?? w / 2 + (Math.random() - 0.5) * 50,
        y: existing?.y ?? GRAPH_HEIGHT / 2 + (Math.random() - 0.5) * 50,
        color: fz.ink,
      };
    });

    const nodeMap = new Map(newNodes.map((n) => [n.id, n]));

    // Initialize Links with references to actual node objects if available
    const newLinks: Link[] = connections
      .filter((c) => nodeMap.has(c.person1Id) && nodeMap.has(c.person2Id))
      .map((c) => ({
        id: c.id,
        source: c.person1Id,
        target: c.person2Id,
      }));

    nodesRef.current = newNodes;
    linksRef.current = newLinks;

    if (simulationRef.current) simulationRef.current.stop();

    simulationRef.current = d3
      .forceSimulation<Node, Link>(newNodes)
      .force(
        'link',
        d3
          .forceLink<Node, Link>(newLinks)
          .id((d) => d.id)
          .distance(LINK_DISTANCE)
      )
      .force('charge', d3.forceManyBody().strength(MANY_BODY_STRENGTH).distanceMax(250))
      .force('center', d3.forceCenter(w / 2, GRAPH_HEIGHT / 2).strength(CENTER_FORCE))
      .force('collide', d3.forceCollide(COLLISION_RADIUS));

    simulationRef.current.on('tick', () => {
      // Trigger React render. node objects are mutated in place by d3, so the
      // new array refs carry live positions; refs keep the same live objects for hit-testing.
      setNodes([...newNodes]);
      setLinks([...newLinks]);
    });

    simulationRef.current.restart();

    return () => {
      simulationRef.current?.stop();
    };
  }, [people, connections, layoutWidth]);

  // Keep selection + callback refs current.
  useEffect(() => {
    selectedPersonIdRef.current = selectedPersonId;
  }, [selectedPersonId]);
  useEffect(() => {
    onSelectPersonRef.current = onSelectPerson;
  }, [onSelectPerson]);

  // --- AUTO-CENTER THE SELECTED NODE if it's outside the viewport ---
  useEffect(() => {
    if (!selectedPersonId) return;
    const node = nodesRef.current.find((n) => n.id === selectedPersonId);
    if (!node || node.x == null || node.y == null) return;

    const { scale, x: camX, y: camY } = cameraRef.current;
    const screenX = node.x * scale + camX;
    const screenY = node.y * scale + camY;
    const margin = NODE_RADIUS * 3;
    const w = layoutRef.current || SCREEN_WIDTH;
    const inView =
      screenX > margin && screenX < w - margin && screenY > margin && screenY < GRAPH_HEIGHT - margin;
    if (inView) return;

    commitCamera({ x: w / 2 - node.x * scale, y: GRAPH_HEIGHT / 2 - node.y * scale, scale });
  }, [selectedPersonId, commitCamera]);

  // --- 2. GESTURE HANDLERS ---
  // Built once: handlers read live state from refs, so the gesture composition
  // isn't rebuilt on every tick / camera change.
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .onStart(() => {
        startCamera.current = { ...cameraRef.current };
      })
      .onUpdate((e) => {
        // ponytail: read scale LIVE, not from startCamera. Pan and pinch run
        // simultaneously; if pan re-wrote startCamera.scale (captured at gesture
        // start = 1.0) it would clobber the scale pinch just applied. Reading
        // cameraRef.current.scale preserves whatever pinch set, order-independent.
        commitCamera({
          x: startCamera.current.x + e.translationX,
          y: startCamera.current.y + e.translationY,
          scale: cameraRef.current.scale,
        });
      });

    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        startCamera.current = { ...cameraRef.current };
        console.warn(`[PINCH] start | startScale=${startCamera.current.scale}`);
      })
      .onUpdate((e) => {
        const newScale = Math.max(0.5, Math.min(startCamera.current.scale * e.scale, 3));
        console.warn(`[PINCH] update | e.scale=${e.scale.toFixed(3)} startScale=${startCamera.current.scale.toFixed(3)} newScale=${newScale.toFixed(3)} committed=${cameraRef.current.scale.toFixed(3)}`);
        commitCamera({ ...cameraRef.current, scale: newScale });
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDistance(10)
      .onEnd((e) => {
        // Transform Touch to World Coordinates
        const cam = cameraRef.current;
        const worldX = (e.x - cam.x) / cam.scale;
        const worldY = (e.y - cam.y) / cam.scale;

        const HIT_SLOP = 40;
        let closestNode: string | null = null;
        let minDist = HIT_SLOP;

        for (const node of nodesRef.current) {
          if (node.x === undefined || node.y === undefined) continue;

          const dx = node.x - worldX;
          const dy = node.y - worldY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < minDist) {
            minDist = dist;
            closestNode = node.id;
          }
        }

        // Toggle selection
        const current = selectedPersonIdRef.current;
        onSelectPersonRef.current(closestNode === current ? null : closestNode);
      });

    // Double-tap resets to overview: recenter camera AND clear selection.
    // Runs simultaneously with the single tap, so the first tap's fleeting
    // selection is immediately cleared by this — no 300ms single-tap delay.
    const doubleTap = Gesture.Tap()
      .runOnJS(true)
      .numberOfTaps(2)
      .maxDelay(300)
      .onEnd(() => {
        onSelectPersonRef.current(null);
        commitCamera({ x: 0, y: 0, scale: 1 });
      });

    return Gesture.Simultaneous(Gesture.Exclusive(doubleTap, tap), pan, pinch);
    // Built once: all mutable values are read from refs; commitCamera is stable (useCallback).
  }, [commitCamera]);

  const neighborIds = useMemo(
    () =>
      new Set(
        links
          .filter(
            (l) =>
              (l.source as Node).id === selectedPersonId ||
              (l.target as Node).id === selectedPersonId
          )
          .flatMap((l) => [(l.source as Node).id, (l.target as Node).id])
      ),
    [links, selectedPersonId]
  );

  if (nodes.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && w !== layoutRef.current) {
          layoutRef.current = w;
          setLayoutWidth(w);
        }
      }}
    >
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1 }}>
          <Canvas style={styles.canvas}>
            <Group
              transform={[
                { translateX: camera.x },
                { translateY: camera.y },
                { scale: camera.scale },
              ]}
            >
              {/* Links */}
              {links.map((link) => {
                const s = link.source;
                const t = link.target;

                // FIX: Ensure nodes are fully resolved objects before rendering line
                if (!isNode(s) || !isNode(t)) return null;

                // Extra safety for NaN
                if (isNaN(s.x!) || isNaN(s.y!) || isNaN(t.x!) || isNaN(t.y!)) return null;

                const isConnected =
                  selectedPersonId && (s.id === selectedPersonId || t.id === selectedPersonId);
                const opacity = selectedPersonId ? (isConnected ? 1 : 0.1) : 0.2;
                const color = isConnected ? fz.ink : fz.outline;
                const width = isConnected ? 2 : 1;

                return (
                  <Line
                    key={link.id}
                    p1={vec(s.x!, s.y!)}
                    p2={vec(t.x!, t.y!)}
                    color={color}
                    style="stroke"
                    strokeWidth={width}
                    opacity={opacity}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                // Skip if coordinates are missing
                if (node.x === undefined || node.y === undefined) return null;

                return (
                  <GraphNode
                    key={node.id}
                    node={node}
                    x={node.x}
                    y={node.y}
                    isSelected={node.id === selectedPersonId}
                    isNeighbor={neighborIds.has(node.id)}
                    font={font}
                    titleFont={titleFont}
                    clipPath={circleClipPath}
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
  canvas: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});