import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Path,
} from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as d3 from 'd3-force';
import { useTheme } from 'react-native-paper';

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
  people: Array<{ id: string; name: string; photoPath?: string | null; relationshipType?: string | null }>;
  connections: Array<{ id: string; person1Id: string; person2Id: string }>;
  relationshipColors: Record<string, string>;
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
  clipPath 
}: { 
  node: Node,
  x: number,
  y: number, 
  isSelected: boolean, 
  isNeighbor: boolean, 
  font: any, 
  titleFont: any,
  clipPath: any
}) => {
  const image = useImage(node.photoPath || "");
  const shouldShowLabel = isSelected || isNeighbor;
  
  const opacity = (isSelected || isNeighbor) ? 1 : 0.6;
  const scale = isSelected ? 1.2 : 1;

  return (
    <Group 
      transform={[
        { translateX: x }, 
        { translateY: y },
        { scale: scale }
      ]}
      opacity={opacity}
    >
      {/* 1. Node Circle Background (White filler) */}
      <Circle 
        cx={0} 
        cy={0} 
        r={NODE_RADIUS} 
        color="#ffffff" 
        style="fill"
      />

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
      ) : (
        titleFont ? (
          <SkiaText
            x={-8} 
            y={TITLE_FONT_SIZE / 2 - 2}
            text={node.name.substring(0, 2).toUpperCase()}
            font={titleFont}
            color={node.color}
            opacity={1}
          />
        ) : null
      )}

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
            x={-(node.name.length * 3.5)} // Adjusted centering magic number
            y={0}
            text={node.name}
            font={font}
            color="#000000"
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
  relationshipColors,
  selectedPersonId,
  onSelectPerson,
}: ForceDirectedGraphProps) {
  const theme = useTheme();
  
  const font = useFont(require('@/assets/fonts/SpaceMono-Regular.ttf'), FONT_SIZE);
  const titleFont = useFont(require('@/assets/fonts/SpaceMono-Regular.ttf'), TITLE_FONT_SIZE);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);

  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const startCamera = useRef({ x: 0, y: 0, scale: 1 });

  // Create a reusable path for clipping circles
  const circleClipPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(0, 0, NODE_RADIUS - 1); // Slightly smaller to avoid jagged edges at border
    return path;
  }, []);

  // --- 1. SETUP SIMULATION ---
  useEffect(() => {
    if (!people.length) return;

    // Initialize Nodes
    const newNodes: Node[] = people.map(p => {
        const existing = nodes.find(n => n.id === p.id);
        return {
            ...p,
            x: existing ? existing.x : SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 50,
            y: existing ? existing.y : GRAPH_HEIGHT / 2 + (Math.random() - 0.5) * 50,
            color: (p.relationshipType && relationshipColors[p.relationshipType]) 
                   ? relationshipColors[p.relationshipType] 
                   : theme.colors.primary
        };
    });

    const nodeMap = new Map(newNodes.map(n => [n.id, n]));
    
    // Initialize Links with references to actual node objects if available
    const newLinks: Link[] = connections
        .filter(c => nodeMap.has(c.person1Id) && nodeMap.has(c.person2Id))
        .map(c => ({
            id: c.id,
            source: c.person1Id,
            target: c.person2Id,
        }));

    if (simulationRef.current) simulationRef.current.stop();

    simulationRef.current = d3.forceSimulation<Node, Link>(newNodes)
        .force('link', d3.forceLink<Node, Link>(newLinks).id(d => d.id).distance(LINK_DISTANCE))
        .force('charge', d3.forceManyBody().strength(MANY_BODY_STRENGTH).distanceMax(250))
        .force('center', d3.forceCenter(SCREEN_WIDTH / 2, GRAPH_HEIGHT / 2).strength(CENTER_FORCE))
        .force('collide', d3.forceCollide(COLLISION_RADIUS));

    simulationRef.current.on('tick', () => {
        // Trigger React Render
        setNodes([...newNodes]); 
        setLinks([...newLinks]);
    });

    simulationRef.current.restart();

    // FIX: Explicitly return void for cleanup
    return () => {
        simulationRef.current?.stop();
    };
  }, [people, connections, relationshipColors]);

  // --- 2. GESTURE HANDLERS ---
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
        .runOnJS(true)
        .onStart(() => {
            startCamera.current = { ...camera };
        })
        .onUpdate((e) => {
            setCamera({
                x: startCamera.current.x + e.translationX,
                y: startCamera.current.y + e.translationY,
                scale: startCamera.current.scale
            });
        });

    const pinch = Gesture.Pinch()
        .runOnJS(true)
        .onStart(() => {
            startCamera.current = { ...camera };
        })
        .onUpdate((e) => {
            const newScale = startCamera.current.scale * e.scale;
            setCamera({
                ...camera,
                scale: Math.max(0.5, Math.min(newScale, 3))
            });
        });

    const tap = Gesture.Tap()
        .runOnJS(true)
        .maxDistance(10)
        .onEnd((e) => {
            // Transform Touch to World Coordinates
            const worldX = (e.x - camera.x) / camera.scale;
            const worldY = (e.y - camera.y) / camera.scale;

            const HIT_SLOP = 40;
            let closestNode: string | null = null;
            let minDist = HIT_SLOP;

            for (const node of nodes) {
                // Skip nodes that haven't been positioned yet
                if (node.x === undefined || node.y === undefined) continue;

                const dx = node.x - worldX;
                const dy = node.y - worldY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < minDist) {
                    minDist = dist;
                    closestNode = node.id;
                }
            }
            
            // Toggle selection
            onSelectPerson(closestNode === selectedPersonId ? null : closestNode);
        });

    return Gesture.Simultaneous(tap, pan, pinch);
  }, [camera, nodes, selectedPersonId, onSelectPerson]);

  const neighborIds = useMemo(() => new Set(
    links
      .filter(l => (l.source as Node).id === selectedPersonId || (l.target as Node).id === selectedPersonId)
      .flatMap(l => [(l.source as Node).id, (l.target as Node).id])
  ), [links, selectedPersonId]);

  if (nodes.length === 0) {
      return (
        <View style={[styles.container, styles.centered]}>
            <ActivityIndicator size="large" />
        </View>
      );
  }

  return (
    <View style={styles.container}>
        <GestureDetector gesture={gesture}>
            <View style={{ flex: 1 }}>
                <Canvas style={styles.canvas}>
                    <Group 
                        transform={[
                            { translateX: camera.x },
                            { translateY: camera.y },
                            { scale: camera.scale }
                        ]}
                    >
                        {/* Links */}
                        {links.map(link => {
                            const s = link.source;
                            const t = link.target;
                            
                            // FIX: Ensure nodes are fully resolved objects before rendering line
                            if (!isNode(s) || !isNode(t)) return null;
                            
                            // Extra safety for NaN
                            if (isNaN(s.x!) || isNaN(s.y!) || isNaN(t.x!) || isNaN(t.y!)) return null;

                            const isConnected = selectedPersonId && 
                                (s.id === selectedPersonId || t.id === selectedPersonId);
                            const opacity = selectedPersonId ? (isConnected ? 1 : 0.1) : 0.2;
                            const color = isConnected ? theme.colors.primary : "#999";
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
                        {nodes.map(node => {
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
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        overflow: 'hidden',
    },
    canvas: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    }
});