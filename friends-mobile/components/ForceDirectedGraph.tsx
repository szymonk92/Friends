import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import Svg, { Circle, Line, G, ClipPath, Defs, Image as SvgImage, Text as SvgText, Rect } from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as d3 from 'd3-force';
import { getInitials } from '@/lib/utils/format';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- CONFIGURATION ---
const NODE_RADIUS = 32;
const CLICK_TOLERANCE = 40;
const SIM_WIDTH = SCREEN_WIDTH * 2; 
const SIM_HEIGHT = SCREEN_HEIGHT * 2;
// Bounds: Keep nodes within 90% of the simulation area
const BOUNDS_PADDING = 100;

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  photoPath?: string | null;
  relationshipType?: string | null;
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

export default React.memo(function ForceDirectedGraph({
  people,
  connections,
  relationshipColors,
  selectedPersonId,
  onSelectPerson,
}: ForceDirectedGraphProps) {
  const theme = useTheme();

  // --- STATE ---
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  
  // Refs
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const nodesRef = useRef<Node[]>([]); 
  const mountedRef = useRef(true); // To prevent setting state on unmounted component

  // ViewBox Management
  const viewBoxRef = useRef({ x: -SIM_WIDTH/4, y: -SIM_HEIGHT/4, w: SIM_WIDTH, h: SIM_HEIGHT });
  const [viewBox, setViewBoxState] = useState(viewBoxRef.current);

  const updateViewBox = (newBox: {x: number, y: number, w: number, h: number}) => {
    viewBoxRef.current = newBox;
    setViewBoxState(newBox);
  };

  // Gesture Context
  const ctx = useRef({
    startX: 0, startY: 0,
    startViewX: 0, startViewY: 0, startViewW: 0, startViewH: 0,
  });

  // --- CUSTOM FORCE: BOUNDING BOX ---
  // This prevents nodes from flying off into infinity
  const forceBoundingBox = (alpha: number) => {
    for (let node of nodesRef.current) {
      if (!node.x || !node.y) continue;
      // Left/Right Walls
      if (node.x < BOUNDS_PADDING) node.vx! += (BOUNDS_PADDING - node.x) * alpha;
      if (node.x > SIM_WIDTH - BOUNDS_PADDING) node.vx! += (SIM_WIDTH - BOUNDS_PADDING - node.x) * alpha;
      // Top/Bottom Walls
      if (node.y < BOUNDS_PADDING) node.vy! += (BOUNDS_PADDING - node.y) * alpha;
      if (node.y > SIM_HEIGHT - BOUNDS_PADDING) node.vy! += (SIM_HEIGHT - BOUNDS_PADDING - node.y) * alpha;
    }
  };

  // --- CLICK HANDLER ---
  const processNodeClick = (nodeId: string | null) => {
    // If nodeId is null, we are resetting/deselecting.
    if (!nodeId) {
        onSelectPerson(null);
        const sim = simulationRef.current;
        if (sim) {
            sim.nodes().forEach(n => { n.fx = null; n.fy = null; });
            sim.alpha(0.3).restart();
        }
        return;
    }

    const isSelecting = selectedPersonId !== nodeId;
    onSelectPerson(isSelecting ? nodeId : null);

    const sim = simulationRef.current;
    if (!sim) return;
    const allNodes = sim.nodes();

    if (isSelecting) {
        // 1. Pin Selection
        const centerNode = allNodes.find(n => n.id === nodeId);
        if (centerNode) {
            centerNode.fx = SIM_WIDTH / 2;
            centerNode.fy = SIM_HEIGHT / 2;
        }
        // 2. Release others
        allNodes.forEach(n => {
            if (n.id !== nodeId) { n.fx = null; n.fy = null; }
        });
        sim.alpha(0.3).restart();

        // 3. Smooth Zoom to Selection
        const targetW = SCREEN_WIDTH; // Closer zoom
        const targetH = SCREEN_HEIGHT;
        updateViewBox({
            x: (SIM_WIDTH / 2) - (targetW / 2),
            y: (SIM_HEIGHT / 2) - (targetH / 2),
            w: targetW,
            h: targetH
        });
    } else {
        // Reset (Deselecting the same node)
        allNodes.forEach(n => { n.fx = null; n.fy = null; });
        sim.alpha(0.3).restart();
    }
  };

  // --- GESTURES ---
  const gestures = useMemo(() => {
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(10000) // Allow slow taps
      .onEnd((e) => {
          const vb = viewBoxRef.current;
          const scale = vb.w / SCREEN_WIDTH;
          const clickX = vb.x + (e.x * scale);
          const clickY = vb.y + (e.y * scale);

          const clickedNode = nodesRef.current.find(node => {
              if (!node.x || !node.y) return false;
              const dx = node.x - clickX;
              const dy = node.y - clickY;
              return Math.sqrt(dx * dx + dy * dy) < CLICK_TOLERANCE;
          });

          if (clickedNode) {
              // FIX: If clicked on the currently selected node, deselect it.
              // If clicked on a new node, select it.
              processNodeClick(clickedNode.id);
          } else if (selectedPersonId) {
              // FIX: If clicked on empty space while a node is selected, deselect the current node.
              processNodeClick(null); 
          }
      });

    const pan = Gesture.Pan()
      .runOnJS(true)
      .averageTouches(true)
      .activeOffsetX([-10, 10]) .activeOffsetY([-10, 10])
      .onStart(() => {
        const vb = viewBoxRef.current;
        ctx.current.startViewX = vb.x;
        ctx.current.startViewY = vb.y;
        ctx.current.startViewW = vb.w;
      })
      .onUpdate((e) => {
        const zoomRatio = ctx.current.startViewW / SCREEN_WIDTH;
        const newX = ctx.current.startViewX - (e.translationX * zoomRatio);
        const newY = ctx.current.startViewY - (e.translationY * zoomRatio);
        if (!isNaN(newX) && !isNaN(newY)) updateViewBox({ ...viewBoxRef.current, x: newX, y: newY });
      });

    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        const vb = viewBoxRef.current;
        ctx.current.startViewX = vb.x;
        ctx.current.startViewY = vb.y;
        ctx.current.startViewW = vb.w;
        ctx.current.startViewH = vb.h;
      })
      .onUpdate((e) => {
        const scale = e.scale;
        if (isNaN(scale) || scale === 0) return;
        const safeScale = Math.max(0.2, Math.min(scale, 5));
        const newW = ctx.current.startViewW / safeScale;
        const newH = ctx.current.startViewH / safeScale;
        const dW = ctx.current.startViewW - newW;
        const dH = ctx.current.startViewH - newH;
        const newX = ctx.current.startViewX + dW / 2;
        const newY = ctx.current.startViewY + dH / 2;
        if (!isNaN(newX) && !isNaN(newW) && newW > 10) updateViewBox({ x: newX, y: newY, w: newW, h: newH });
      });

    return Gesture.Race(tap, Gesture.Simultaneous(pan, pinch));
  }, [selectedPersonId, onSelectPerson]);

  // --- SIMULATION SETUP ---
  useEffect(() => {
    mountedRef.current = true;
    if (!people.length) return;

    // 1. Merge new data with existing positions
    const newNodes: Node[] = people.map(p => {
      const existing = nodes.find(n => n.id === p.id);
      return {
        ...p,
        // If it's a new node, spawn it near the center but randomized
        x: existing ? existing.x : (SIM_WIDTH/2) + (Math.random() - 0.5) * 100, 
        y: existing ? existing.y : (SIM_HEIGHT/2) + (Math.random() - 0.5) * 100,
      };
    });

    nodesRef.current = newNodes; 

    const nodeMap = new Map(newNodes.map(n => [n.id, n]));
    const newLinks: Link[] = connections
      .filter(c => nodeMap.has(c.person1Id) && nodeMap.has(c.person2Id))
      .map(c => ({
        id: c.id,
        source: c.person1Id,
        target: c.person2Id,
      }));

    if (simulationRef.current) simulationRef.current.stop();

    // 2. Configure D3
    simulationRef.current = d3.forceSimulation<Node, Link>(newNodes)
      .force('link', d3.forceLink<Node, Link>(newLinks).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(SIM_WIDTH / 2, SIM_HEIGHT / 2))
      .force('collide', d3.forceCollide(NODE_RADIUS + 10))
      .force('bounds', forceBoundingBox); // <--- Add custom wall force

    // 3. Optimization: Throttle updates to 30fps for large graphs
    let lastTick = 0;
    simulationRef.current.on('tick', () => {
      if (!mountedRef.current) return;
      
      const now = Date.now();
      if (now - lastTick > 32) { // ~30ms throttling
        setNodes([...newNodes]);
        nodesRef.current = newNodes;
        setLinks([...newLinks]);
        lastTick = now;
      }
    });

    simulationRef.current.restart();

    return () => { 
      mountedRef.current = false;
      simulationRef.current?.stop(); 
    };
  }, [people, connections]);

  // --- RENDER ---
  const viewBoxString = useMemo(() => {
    const safeX = isNaN(viewBox.x) ? 0 : viewBox.x;
    const safeY = isNaN(viewBox.y) ? 0 : viewBox.y;
    const safeW = isNaN(viewBox.w) || viewBox.w <= 0 ? SCREEN_WIDTH : viewBox.w;
    const safeH = isNaN(viewBox.h) || viewBox.h <= 0 ? SCREEN_HEIGHT : viewBox.h;
    return `${safeX} ${safeY} ${safeW} ${safeH}`;
  }, [viewBox]);

  // Find selected node details for the Info Bar
  const selectedNode = useMemo(() => 
    people.find(p => p.id === selectedPersonId), 
  [selectedPersonId, people]);
  
  // Mapping of ID to Name for connection labels
  const personNameMap = useMemo(() => 
    new Map(people.map(p => [p.id, p.name])), 
  [people]);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gestures}>
        <View style={styles.svgWrapper} collapsable={false}>
          <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT * 0.7} viewBox={viewBoxString} preserveAspectRatio="xMidYMid meet">
            <Defs>
              {nodes.map(n => (
                <ClipPath key={n.id} id={`clip-${n.id}`}>
                   <Circle cx={n.x || 0} cy={n.y || 0} r={NODE_RADIUS} />
                </ClipPath>
              ))}
            </Defs>

            {/* Links */}
            {links.map((link) => {
               const s = link.source as Node;
               const t = link.target as Node;
               if(isNaN(s.x!) || isNaN(s.y!) || isNaN(t.x!) || isNaN(t.y!)) return null;
               
               const isConnected = selectedPersonId && (s.id === selectedPersonId || t.id === selectedPersonId);
               const opacity = selectedPersonId ? (isConnected ? 1 : 0.1) : 0.5;
               
               // Calculate midpoint for the label
               const midX = (s.x! + t.x!) / 2;
               const midY = (s.y! + t.y!) / 2;
               
               // Calculate rotation angle (atan2 gives angle in radians from -PI to PI)
               const angleRad = Math.atan2(t.y! - s.y!, t.x! - s.x!);
               let angleDeg = angleRad * (180 / Math.PI);
               
               // Ensure text is right-side up for readability
               if (angleDeg > 90 || angleDeg < -90) {
                 angleDeg += 180;
               }
               
               const sourceName = personNameMap.get(s.id) || 'Unknown';
               const targetName = personNameMap.get(t.id) || 'Unknown';
               const linkLabel = `${sourceName} - ${targetName}`;

               return (
                 <G key={link.id}>
                    <Line
                      x1={s.x} y1={s.y}
                      x2={t.x} y2={t.y}
                      stroke={isConnected ? theme.colors.primary : "#ccc"}
                      strokeWidth={isConnected ? 3 : 1}
                      opacity={opacity}
                    />
                    
                    {/* Connection Label */}
                    {isConnected && (
                        <G 
                            // Translate to the midpoint and rotate
                            transform={`translate(${midX}, ${midY}) rotate(${angleDeg})`}
                        >
                            <Rect
                                // Position background rect centered under the text
                                x={-(linkLabel.length * 4)} 
                                y={-10}
                                width={linkLabel.length * 8}
                                height={20}
                                rx={5}
                                fill={theme.colors.background} // Use a contrasting background color
                                opacity={0.9}
                            />
                            <SvgText
                                x={0}
                                y={5} // Vertical alignment correction
                                fill={theme.colors.onBackground}
                                fontSize={10}
                                fontWeight="bold"
                                textAnchor="middle"
                            >
                                {linkLabel}
                            </SvgText>
                        </G>
                    )}
                 </G>
               );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              if(isNaN(node.x!) || isNaN(node.y!)) return null;
              const isSelected = selectedPersonId === node.id;
              const isNeighbor = selectedPersonId && links.some(l => 
                (l.source as Node).id === selectedPersonId && (l.target as Node).id === node.id ||
                (l.target as Node).id === selectedPersonId && (l.source as Node).id === node.id
              );
              const opacity = selectedPersonId ? (isSelected || isNeighbor ? 1 : 0.3) : 1;

              return (
                <G key={node.id} opacity={opacity}>
                  <Circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_RADIUS}
                    fill={isSelected ? theme.colors.primary : "#fff"}
                    stroke={theme.colors.primary}
                    strokeWidth={isSelected ? 4 : 2}
                  />
                  {node.photoPath ? (
                    <SvgImage
                      x={node.x! - NODE_RADIUS}
                      y={node.y! - NODE_RADIUS}
                      width={NODE_RADIUS * 2}
                      height={NODE_RADIUS * 2}
                      href={{ uri: node.photoPath }}
                      clipPath={`url(#clip-${node.id})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  ) : (
                    <SvgText
                      x={node.x}
                      y={node.y! + 5}
                      fill={isSelected ? "white" : theme.colors.primary}
                      fontSize={14}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {getInitials(node.name)}
                    </SvgText>
                  )}
                  
                  {/* NAME LABEL (Only shown when selected) */}
                  {isSelected && (
                    <G>
                        {/* Background for text readability */}
                        <Rect 
                            x={(node.x || 0) - 60}
                            y={(node.y || 0) - NODE_RADIUS - 35}
                            width={120}
                            height={30}
                            rx={15}
                            fill={theme.colors.inverseSurface}
                            opacity={0.8}
                        />
                        <SvgText
                            x={node.x}
                            y={(node.y || 0) - NODE_RADIUS - 14}
                            fill={theme.colors.inverseOnSurface}
                            fontSize={14}
                            fontWeight="bold"
                            textAnchor="middle"
                        >
                            {node.name}
                        </SvgText>
                    </G>
                  )}
                </G>
              );
            })}
          </Svg>
        </View>
      </GestureDetector>
      
      {/* Info Bar - Restored from your original code */}
      {selectedNode && (
          <View style={styles.infoBar}>
            <View style={styles.infoContent}>
              {selectedNode.photoPath ? (
                <Image source={{ uri: selectedNode.photoPath }} style={styles.infoAvatar} />
              ) : (
                <View style={[styles.infoAvatar, { backgroundColor: theme.colors.primary }]}>
                  <Text style={{ color: 'white' }}>{getInitials(selectedNode.name)}</Text>
                </View>
              )}
              <View style={{ marginLeft: 12 }}>
                <Text variant="titleMedium">{selectedNode.name}</Text>
                <Text variant="bodySmall">{selectedNode.relationshipType || 'Contact'}</Text>
              </View>
            </View>
            <IconButton icon="close" size={20} onPress={() => processNodeClick(selectedNode.id)} />
          </View>
      )}

      {/* Center Button */}
      <View style={styles.controls}>
         <IconButton 
            icon="crosshairs-gps" 
            mode="contained" 
            containerColor={theme.colors.primaryContainer}
            iconColor={theme.colors.onPrimaryContainer}
            onPress={() => {
                // Simple reset logic
                updateViewBox({ x: 0, y: 0, w: SIM_WIDTH, h: SIM_HEIGHT });
            }} 
         />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  svgWrapper: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7, backgroundColor: '#fff' },
  controls: { position: 'absolute', right: 16, bottom: 100 }, // Moved up slightly to avoid InfoBar
  infoBar: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    backgroundColor: 'white', borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4
  },
  infoContent: { flexDirection: 'row', alignItems: 'center' },
  infoAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});