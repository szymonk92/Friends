import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import Svg, { Circle, Line, G, ClipPath, Defs, Image as SvgImage, Text as SvgText } from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as d3 from 'd3-force';
import { getInitials } from '@/lib/utils/format';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Node {
  id: string;
  name: string;
  photoPath?: string | null;
  relationshipType?: string | null;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | Node;
  target: string | Node;
  id: string;
}

interface ForceDirectedGraphProps {
  people: Array<{
    id: string;
    name: string;
    photoPath?: string | null;
    relationshipType?: string | null;
  }>;
  connections: Array<{
    id: string;
    person1Id: string;
    person2Id: string;
  }>;
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
  try {
    const theme = useTheme();
  
  // Virtual canvas for force simulation - smaller for tighter clustering
  const SIMULATION_WIDTH = SCREEN_WIDTH * 1.5;
  const SIMULATION_HEIGHT = SCREEN_HEIGHT;
  
  // Actual viewport dimensions
  const VIEWPORT_WIDTH = SCREEN_WIDTH;
  const VIEWPORT_HEIGHT = SCREEN_HEIGHT * 0.7;
  const NODE_RADIUS = 32; // Larger nodes for better visibility

  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  
  // ViewBox state for pan and zoom (instead of transform)
  const [viewBox, setViewBox] = useState({
    x: 0,
    y: 0,
    width: SIMULATION_WIDTH,
    height: SIMULATION_HEIGHT,
  });

  // Initialize force simulation
  useEffect(() => {
    if (people.length === 0) {
      return;
    }

    try {
      // Create nodes
      const nodeMap = new Map<string, Node>();
      people.forEach((person) => {
        
        nodeMap.set(person.id, {
          id: person.id,
          name: person.name,
          photoPath: person.photoPath,
          relationshipType: person.relationshipType,
        });
      });
      
      // Create links
      const linkList: Link[] = connections
        .filter((conn) => nodeMap.has(conn.person1Id) && nodeMap.has(conn.person2Id))
        .map((conn) => ({
          id: conn.id,
          source: conn.person1Id,
          target: conn.person2Id,
        }));
      
      const nodeList = Array.from(nodeMap.values());

      // Create force simulation optimized for small networks
      const simulation = d3
        .forceSimulation<Node>(nodeList)
        .force(
          'link',
          d3
            .forceLink<Node, Link>(linkList)
            .id((d) => d.id)
            .distance(80) // Closer together
            .strength(0.5) // Stronger links = tighter clusters
        )
        .force('charge', d3.forceManyBody().strength(-200)) // Less repulsion = tighter
        .force('center', d3.forceCenter(SIMULATION_WIDTH / 2, SIMULATION_HEIGHT / 2))
        .force('collision', d3.forceCollide().radius(NODE_RADIUS + 8)) // Less padding
        .alphaDecay(0.02) // Faster settling
        .velocityDecay(0.4);

      console.log('[ForceDirectedGraph] Force simulation created successfully');

      // Update state on each tick
      simulation.on('tick', () => {
        try {
          setNodes([...nodeList]);
          setLinks([...linkList]);
        } catch (error) {
          console.error('[ForceDirectedGraph] Error in simulation tick:', error);
        }
      });

      simulationRef.current = simulation;

    } catch (error) {
      console.error('[ForceDirectedGraph] Error initializing force simulation:', error);
      console.error('[ForceDirectedGraph] Error details:', {
        people: people.map(p => ({ id: p.id, name: p.name })),
        connections: connections.map(c => ({ id: c.id, person1Id: c.person1Id, person2Id: c.person2Id })),
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [people, connections]);

  // Pinch gesture for zoom (updates viewBox)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = Math.max(0.3, Math.min(3, e.scale));
      const centerX = viewBox.x + viewBox.width / 2;
      const centerY = viewBox.y + viewBox.height / 2;
      
      const newWidth = SIMULATION_WIDTH / newScale;
      const newHeight = SIMULATION_HEIGHT / newScale;
      
      setViewBox({
        x: centerX - newWidth / 2,
        y: centerY - newHeight / 2,
        width: newWidth,
        height: newHeight,
      });
    });

  // Pan gesture (updates viewBox)
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const panScale = viewBox.width / VIEWPORT_WIDTH;
      setViewBox(prev => ({
        ...prev,
        x: prev.x - e.translationX * panScale,
        y: prev.y - e.translationY * panScale,
      }));
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // Auto-center when nodes are ready (after simulation settles a bit)
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        centerView();
      }, 1500); // Longer delay to let simulation settle
      return () => clearTimeout(timer);
    }
  }, [nodes.length]);

  const handleNodePress = (nodeId: string) => {
    try {
      if (selectedPersonId === nodeId) {
        // Deselect and restore original layout
        onSelectPerson(null);
        restoreLayout();
      } else {
        // Select and reorganize around this person
        onSelectPerson(nodeId);
        reorganizeAroundNode(nodeId);
      }
    } catch (error) {
      console.error('[ForceDirectedGraph] Error in handleNodePress:', error);
    }
  };

  const reorganizeAroundNode = (nodeId: string) => {
    try {
      const selectedNode = nodes.find(n => n.id === nodeId);
      if (!selectedNode) {
        console.error('[ForceDirectedGraph] Selected node not found:', nodeId);
        return;
      }
      
      if (!simulationRef.current) {
        console.error('[ForceDirectedGraph] Simulation ref is null');
        return;
      }

      // Find connected nodes
      const connectedNodeIds = new Set<string>();
      links.forEach(link => {
        const source = typeof link.source === 'string' ? link.source : link.source.id;
        const target = typeof link.target === 'string' ? link.target : link.target.id;
        
        if (source === nodeId) connectedNodeIds.add(target);
        if (target === nodeId) connectedNodeIds.add(source);
      });

      // Radial layout: center node in middle, connected nodes in circle around it
      const centerX = SIMULATION_WIDTH / 2;
      const centerY = SIMULATION_HEIGHT / 2;
      const radius = 150; // Distance from center

      nodes.forEach((node, index) => {
        if (node.id === nodeId) {
          // Center node
          node.fx = centerX;
          node.fy = centerY;
        } else if (connectedNodeIds.has(node.id)) {
          // Connected nodes in a circle
          const angle = (2 * Math.PI * Array.from(connectedNodeIds).indexOf(node.id)) / connectedNodeIds.size;
          node.fx = centerX + radius * Math.cos(angle);
          node.fy = centerY + radius * Math.sin(angle);
        } else {
          // Other nodes further out
          const angle = (2 * Math.PI * index) / nodes.length;
          node.fx = centerX + radius * 2 * Math.cos(angle);
          node.fy = centerY + radius * 2 * Math.sin(angle);
        }
      });

      // Restart simulation with fixed positions
      simulationRef.current.alpha(0.3).restart();

      // Zoom to show the reorganized cluster
      setTimeout(() => {
        const padding = 100;
        const newViewBox = {
          x: centerX - radius * 2.5 - padding,
          y: centerY - radius * 2.5 - padding,
          width: radius * 5 + padding * 2,
          height: radius * 5 + padding * 2,
        };
        setViewBox(newViewBox);
      }, 100);
    } catch (error) {
      console.error('[ForceDirectedGraph] Error in reorganizeAroundNode:', error);
    }
  };

  const restoreLayout = () => {
    try {
      console.log('[ForceDirectedGraph] Restoring layout');
      
      if (!simulationRef.current) {
        console.error('[ForceDirectedGraph] Simulation ref is null in restoreLayout');
        return;
      }

      // Release all fixed positions
      nodes.forEach(node => {
        node.fx = null;
        node.fy = null;
      });

      console.log('[ForceDirectedGraph] Released fixed positions, restarting simulation');
      // Restart simulation to return to natural layout
      simulationRef.current.alpha(0.5).restart();

      // Zoom out to show all
      setTimeout(() => {
        console.log('[ForceDirectedGraph] Centering view after restore');
        centerView();
      }, 500);
    } catch (error) {
      console.error('[ForceDirectedGraph] Error in restoreLayout:', error);
    }
  };

  const centerView = () => {
    // Calculate the bounding box of all nodes
    if (nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x);
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y);
      }
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Add padding - less for small networks
    const padding = Math.min(150, width * 0.3);
    const paddedWidth = Math.max(width + padding * 2, SIMULATION_WIDTH * 0.6);
    const paddedHeight = Math.max(height + padding * 2, SIMULATION_HEIGHT * 0.6);

    // Set viewBox to show all nodes with padding
    setViewBox({
      x: centerX - paddedWidth / 2,
      y: centerY - paddedHeight / 2,
      width: paddedWidth,
      height: paddedHeight,
    });
  };

  const darkenColor = (color: string, amount: number): string => {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substring(0, 2), 16) * (1 - amount));
    const g = Math.max(0, parseInt(hex.substring(2, 4), 16) * (1 - amount));
    const b = Math.max(0, parseInt(hex.substring(4, 6), 16) * (1 - amount));
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
  };

  if (nodes.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>No network data available</Text>
      </View>
    );
  }

  console.log('[ForceDirectedGraph] Rendering with:', {
    nodesCount: nodes.length,
    linksCount: links.length,
    selectedPersonId,
    viewBox,
    hasSimulation: !!simulationRef.current,
  });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.svgContainer}>
          <Svg 
            width={VIEWPORT_WIDTH} 
            height={VIEWPORT_HEIGHT}
            viewBox={`${viewBox.x || 0} ${viewBox.y || 0} ${viewBox.width || SIMULATION_WIDTH} ${viewBox.height || SIMULATION_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <Defs>
              {/* Define clip paths for circular avatars */}
              {nodes.map((node) => {
                if (!node.x || !node.y) return null;
                return (
                  <ClipPath key={`clip-${node.id}`} id={`clip-${node.id}`}>
                    <Circle cx={node.x} cy={node.y} r={NODE_RADIUS} />
                  </ClipPath>
                );
              })}
            </Defs>

            {/* Draw links */}
            {links.map((link) => {
              const source = link.source as Node;
              const target = link.target as Node;
              if (!source.x || !source.y || !target.x || !target.y) return null;

              const isHighlighted =
                selectedPersonId === source.id || selectedPersonId === target.id;

              return (
                <Line
                  key={link.id}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isHighlighted ? theme.colors.primary : '#ccc'}
                  strokeWidth={isHighlighted ? 2 : 1}
                  opacity={selectedPersonId && !isHighlighted ? 0.2 : 0.6}
                />
              );
            })}

            {/* Draw nodes */}
            {nodes.map((node) => {
              if (!node.x || !node.y) {
                return null;
              }

              const isSelected = selectedPersonId === node.id;
              const personColor = node.relationshipType
                ? relationshipColors[node.relationshipType] || theme.colors.primary
                : theme.colors.primary;
              const nodeColor = isSelected ? darkenColor(personColor, 0.3) : personColor;
                
              return (
                <G
                  key={node.id}
                  onPress={() => handleNodePress(node.id)}
                  opacity={
                    !selectedPersonId || isSelected || links.some(
                      (l) => 
                        ((l.source as Node).id === node.id && (l.target as Node).id === selectedPersonId) ||
                        ((l.target as Node).id === node.id && (l.source as Node).id === selectedPersonId)
                    )
                      ? 1
                      : 0.3
                  }
                >
                  {/* Avatar background circle */}
                  <Circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_RADIUS}
                    fill={nodeColor}
                    stroke={isSelected ? '#fff' : 'transparent'}
                    strokeWidth={isSelected ? 3 : 0}
                  />

                  {/* Avatar image or initials */}
                  {node.photoPath ? (
                    <G clipPath={`url(#clip-${node.id})`}>
                      <SvgImage
                        x={node.x - NODE_RADIUS}
                        y={node.y - NODE_RADIUS}
                        width={NODE_RADIUS * 2}
                        height={NODE_RADIUS * 2}
                        href={node.photoPath}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </G>
                  ) : (
                    <SvgText
                      x={node.x}
                      y={node.y + 6}
                      fontSize={16}
                      fill="white"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {getInitials(node.name)}
                    </SvgText>
                  )}
                </G>
              );
            })}
          </Svg>
        </View>
      </GestureDetector>
      
      {/* Floating recenter button */}
      <View style={styles.controls}>
        <IconButton
          icon="image-filter-center-focus"
          mode="contained"
          size={24}
          onPress={centerView}
          style={styles.centerButton}
          containerColor={theme.colors.primary}
          iconColor="#fff"
        />
      </View>

      {/* Selected person info bar */}
      {selectedPersonId && (() => {
        const selectedNode = people.find(p => p.id === selectedPersonId);
        if (!selectedNode) return null;
        
        const personColor = selectedNode.relationshipType
          ? relationshipColors[selectedNode.relationshipType] || theme.colors.primary
          : theme.colors.primary;
        
        const connectionCount = connections.filter(c => 
          c.person1Id === selectedPersonId || c.person2Id === selectedPersonId
        ).length;

        return (
          <View style={styles.infoBar}>
            <View style={styles.infoContent}>
              {selectedNode.photoPath ? (
                <Image 
                  source={{ uri: selectedNode.photoPath }} 
                  style={[styles.infoAvatar, { backgroundColor: personColor }]}
                />
              ) : (
                <View style={[styles.infoAvatar, { backgroundColor: personColor }]}>
                  <Text style={styles.infoAvatarText}>
                    {getInitials(selectedNode.name)}
                  </Text>
                </View>
              )}
              <View style={styles.infoText}>
                <Text variant="titleMedium" style={styles.infoName}>
                  {selectedNode.name}
                </Text>
                <View style={styles.infoMeta}>
                  {selectedNode.relationshipType && (
                    <Text variant="bodySmall" style={styles.infoType}>
                      {selectedNode.relationshipType}
                    </Text>
                  )}
                  <Text variant="bodySmall" style={styles.infoConnections}>
                    • {connectionCount} connection{connectionCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>
            <IconButton
              icon="close"
              size={20}
              onPress={() => {
                onSelectPerson(null);
                restoreLayout();
              }}
            />
          </View>
        );
      })()}

      <View style={styles.instructions}>
        <Text variant="labelSmall" style={styles.instructionText}>
          Pinch to zoom • Drag to pan • Tap person to see details
        </Text>
      </View>
    </View>
  );
  } catch (error) {
    console.error('[ForceDirectedGraph] CRASH: Component threw an error:', error);
    console.error('[ForceDirectedGraph] CRASH: Props received:', {
      peopleCount: people?.length,
      connectionsCount: connections?.length,
      selectedPersonId,
      relationshipColorsKeys: relationshipColors ? Object.keys(relationshipColors) : [],
    });
    
    // Return error UI
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text variant="headlineSmall" style={{ marginBottom: 10 }}>
          Graph Error
        </Text>
        <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 20 }}>
          Something went wrong rendering the network graph. Check console for details.
        </Text>
        <Text variant="bodySmall" style={{ color: 'red' }}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
      </View>
    );
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  svgContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    zIndex: 10,
  },
  centerButton: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  instructions: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
  },
  instructionText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  infoAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  infoText: {
    flex: 1,
  },
  infoName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  infoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoType: {
    opacity: 0.7,
  },
  infoConnections: {
    opacity: 0.6,
  },
});
