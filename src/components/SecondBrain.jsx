import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../utils/db';
import { 
  GitFork, Search, Plus, Sparkles, BookOpen, Tag, 
  ChevronRight, ChevronLeft, HelpCircle, Maximize2, 
  Minimize2, RefreshCw, Layers, Edit, Eye, Trash2,
  Database
} from 'lucide-react';

// Unified aesthetic colors: blue for journals (logs), yellow for tags
const JOURNAL_COLOR = { 
  fill: 'rgba(56, 189, 248, 0.25)', 
  border: 'hsl(199, 89%, 48%)', 
  glow: 'rgba(56, 189, 248, 0.4)', 
  text: 'hsl(199, 89%, 75%)' 
};

const TAG_COLOR = { 
  fill: 'rgba(251, 191, 36, 0.2)', 
  border: 'hsl(45, 93%, 47%)', 
  glow: 'rgba(251, 191, 36, 0.35)', 
  text: 'hsl(45, 93%, 75%)' 
};

// 10 Varied Test entries with distinct tags
const SEED_TEST_ENTRIES = [
  {
    id: 'seed-test-1',
    title: 'Morning Run in the Fog',
    content: '<p>Woke up early and completed a 5km run through the thick morning fog. The cold air filled my lungs, giving me an incredibly raw surge of biological physical energy! Linked closely to my fitness routine.</p>',
    date: '2026-05-30',
    mood: 'energetic',
    weather: 'windy',
    tags: ['fitness', 'morning', 'nature'],
    fontType: 'sans',
    wordCount: 38,
    googleFileId: ''
  },
  {
    id: 'seed-test-2',
    title: 'Midday Quiet Focus Block',
    content: '<p>Spent the last three hours locked into a quiet coding flow block working on the React canvas logic. Calm atmosphere in the office. Feeling peaceful and highly focused today.</p>',
    date: '2026-05-29',
    mood: 'calm',
    weather: 'sunny',
    tags: ['work', 'productivity'],
    fontType: 'mono',
    wordCount: 32,
    googleFileId: ''
  },
  {
    id: 'seed-test-3',
    title: 'Anxiety before Presentation',
    content: '<p>Chest feels tight and breathing is shallow. Got a major client presentation in an hour. Extremely anxious about my career growth if this goes poorly. Trying to practice deep breathing.</p>',
    date: '2026-05-28',
    mood: 'anxious',
    weather: 'cloudy',
    tags: ['career', 'anxiety', 'morning'],
    fontType: 'sans',
    wordCount: 34,
    googleFileId: ''
  },
  {
    id: 'seed-test-4',
    title: 'Walking under Sage Trees',
    content: '<p>Took a peaceful afternoon walk under the gorgeous sage trees in the local park. The smell of the green leaves and dry earth is absolute pure joy. Completely reset my mood.</p>',
    date: '2026-05-27',
    mood: 'happy',
    weather: 'sunny',
    tags: ['nature', 'peace', 'mindfulness'],
    fontType: 'serif',
    wordCount: 33,
    googleFileId: ''
  },
  {
    id: 'seed-test-5',
    title: 'Late Night Creative Code High',
    content: '<p>Coding canvas physics engine details at 2 AM. Complete focus, listening to lofi ambient beats. Pure creative high, creating a beautiful network map is deeply satisfying.</p>',
    date: '2026-05-26',
    mood: 'energetic',
    weather: 'clear',
    tags: ['creativity', 'work'],
    fontType: 'mono',
    wordCount: 31,
    googleFileId: ''
  },
  {
    id: 'seed-test-6',
    title: 'Quiet Philosophy Reflections',
    content: '<p>Spent the evening sitting in the arm chair reading Seneca and Marcus Aurelius. Pensive and reflective mood. Thinking deeply about daily habits, mindfulness, and the passage of time.</p>',
    date: '2026-05-25',
    mood: 'pensive',
    weather: 'cloudy',
    tags: ['reflection', 'learnings'],
    fontType: 'serif',
    wordCount: 34,
    googleFileId: ''
  },
  {
    id: 'seed-test-7',
    title: 'Melancholy on a Gray Sunday',
    content: '<p>A heavy, gray, slow-moving Sunday. Struggling to find motivation. Just sitting in the quiet silence, letting the melancholy pass. Resting today.</p>',
    date: '2026-05-24',
    mood: 'sad',
    weather: 'rainy',
    tags: ['reflection', 'peace'],
    fontType: 'serif',
    wordCount: 26,
    googleFileId: ''
  },
  {
    id: 'seed-test-8',
    title: 'Project Launch Celebration',
    content: '<p>We launched the Google client dashboard! The client was absolutely wowed by the glassmorphism design. Feeling incredibly happy and proud of what we achieved. Career milestone!</p>',
    date: '2026-05-23',
    mood: 'happy',
    weather: 'sunny',
    tags: ['career', 'joy'],
    fontType: 'sans',
    wordCount: 31,
    googleFileId: ''
  },
  {
    id: 'seed-test-9',
    title: 'Yoga and Mental Equilibrium',
    content: '<p>Did a 45-minute stretching and yoga block this morning. Balanced my breathing and re-established mental peace. Mindfulness practice is so vital for maintaining sanity.</p>',
    date: '2026-05-22',
    mood: 'calm',
    weather: 'sunny',
    tags: ['fitness', 'mindfulness', 'peace', 'morning'],
    fontType: 'sans',
    wordCount: 29,
    googleFileId: ''
  },
  {
    id: 'seed-test-10',
    title: 'Overthinking Career Goals',
    content: '<p>Wandered into a deep spiral of overthinking my next five years. Feeling some anxiety about the unknown path. Trying to reflect calmly and plan rather than stress.</p>',
    date: '2026-05-21',
    mood: 'pensive',
    weather: 'cloudy',
    tags: ['anxiety', 'reflection', 'career'],
    fontType: 'serif',
    wordCount: 30,
    googleFileId: ''
  }
];

export default function SecondBrain({ entries, onNewEntry, onEditEntry, onDeleteEntry }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Interactive navigation states
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };
    handleResize(); // initialize on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Ref-based state variables to avoid useEffect teardowns and stutters
  const selectedNodeRef = useRef(null);
  const hoveredNodeRef = useRef(null);
  const isDraggingCanvasRef = useRef(false);
  
  // Physics parameters calibrated for beautiful Logs-to-Tags balance
  const [physicsConfig, setPhysicsConfig] = useState({
    gravity: 0.012,        // Soft gravity pull
    repulsion: 240,        // Strong repulsion to keep tags and logs spaced
    attraction: 0.02,      // Elastic spring attraction
    damping: 0.82,         // Stable coordinate dampening
    particleSpeed: 0.9,
    showParticles: true
  });

  const physicsConfigRef = useRef(physicsConfig);
  useEffect(() => {
    physicsConfigRef.current = physicsConfig;
  }, [physicsConfig]);

  // Sync state values to refs for smooth 60 FPS access
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  useEffect(() => {
    hoveredNodeRef.current = hoveredNode;
  }, [hoveredNode]);

  // Pan and zoom states
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const [zoom, setZoom] = useState(0.95);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragNodeRef = useRef(null);

  // Persistent coordinate store
  const nodePositionsRef = useRef(new Map());

  // Physics Cooldown / Freezing parameters
  const physicsActiveRef = useRef(true);
  const physicsTicksRef = useRef(0);

  const awakenPhysics = () => {
    physicsActiveRef.current = true;
    physicsTicksRef.current = 0;
  };

  // Identify if there are seeded test entries currently loaded in the database
  const hasSeedTestData = useMemo(() => {
    return entries.some(e => e.id.startsWith('seed-test-'));
  }, [entries]);

  // Seed test logs database action
  const handleSeedTestData = async () => {
    try {
      awakenPhysics();
      await handleClearTestData(true);
      await db.entries.bulkAdd(SEED_TEST_ENTRIES);
      setSelectedNode(null);
    } catch (err) {
      console.error('Failed to seed test data:', err);
    }
  };

  // Clear test logs database action
  const handleClearTestData = async (silent = false) => {
    try {
      awakenPhysics();
      await db.entries.where('id').startsWith('seed-test-').delete();
      setSelectedNode(null);
      if (!silent) {
        alert('Seeded test constellation cleared from your database.');
      }
    } catch (err) {
      console.error('Failed to clear test data:', err);
    }
  };

  // Build strictly Logs (Journal Entries) and Tags network
  const { nodes, links, nodeMap } = useMemo(() => {
    const nodesList = [];
    const linksList = [];
    const nodeMapById = new Map();

    const getNodeCoords = (id) => {
      const cached = nodePositionsRef.current.get(id);
      if (cached) return cached;
      const angle = Math.random() * Math.PI * 2;
      const radius = 60 + Math.random() * 150;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0
      };
    };

    // 1. Add Journal (Log) Nodes
    entries.forEach(entry => {
      const id = entry.id;
      const coords = getNodeCoords(id);
      const node = {
        id,
        label: entry.title || 'Untitled Reflection',
        type: 'journal',
        size: Math.max(13, Math.min(25, 13 + (entry.content?.length || 0) / 180)),
        original: entry,
        ...coords
      };
      nodesList.push(node);
      nodeMapById.set(id, node);
      nodePositionsRef.current.set(id, { x: node.x, y: node.y, vx: node.vx, vy: node.vy });
    });

    // 2. Add Tag Nodes & Links strictly between Tags and Journals
    const tagConnections = new Map();
    entries.forEach(entry => {
      if (!entry.tags || !Array.isArray(entry.tags)) return;
      entry.tags.forEach(t => {
        const cleanTag = t.trim().toLowerCase();
        if (!cleanTag || cleanTag === 'synced') return; 
        if (!tagConnections.has(cleanTag)) {
          tagConnections.set(cleanTag, new Set());
        }
        tagConnections.get(cleanTag).add(entry.id);
      });
    });

    tagConnections.forEach((connectedIds, tag) => {
      const tagNodeId = `tag-${tag}`;
      const coords = getNodeCoords(tagNodeId);
      const node = {
        id: tagNodeId,
        label: `#${tag}`,
        type: 'tag',
        size: 11 + Math.min(10, connectedIds.size * 1.5), 
        original: { tag, connectedIds: Array.from(connectedIds) },
        ...coords
      };
      nodesList.push(node);
      nodeMapById.set(tagNodeId, node);
      nodePositionsRef.current.set(tagNodeId, { x: node.x, y: node.y, vx: node.vx, vy: node.vy });

      connectedIds.forEach(journalId => {
        linksList.push({
          id: `link-${journalId}-${tagNodeId}`,
          source: journalId,
          target: tagNodeId,
          type: 'tag-connection'
        });
      });
    });

    awakenPhysics();

    return { nodes: nodesList, links: linksList, nodeMap: nodeMapById };
  }, [entries]);

  const recenterGraph = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    setPan({ x: canvas.width / 2, y: canvas.height / 2 });
    setZoom(0.95);
    awakenPhysics();
  };

  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Centering triggers at different layout points to smooth transitions
    setTimeout(recenterGraph, 50);
    setTimeout(recenterGraph, 150);
    setTimeout(recenterGraph, 380); // Grid transition finishes after 350ms!

    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen, isMobile]);

  // Continuous Animation Frame loop with Physics Cooldown
  useEffect(() => {
    let animationFrameId;
    
    const updatePhysics = () => {
      if (nodes.length === 0) return;

      if (!physicsActiveRef.current && !dragNodeRef.current) return;

      const currentConfig = physicsConfigRef.current;
      const { gravity, repulsion, attraction, damping } = currentConfig;

      // 1. Repulsion force between all nodes
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const safeDist = Math.max(15, dist);

          if (dist < 380) {
            const force = repulsion / safeDist;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            nodeA.vx -= fx;
            nodeA.vy -= fy;
            nodeB.vx += fx;
            nodeB.vy += fy;
          }
        }
      }

      // 2. Spring attraction along links
      links.forEach(link => {
        const nodeA = nodeMap.get(link.source);
        const nodeB = nodeMap.get(link.target);
        if (!nodeA || !nodeB) return;

        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;

        const fx = dx * attraction;
        const fy = dy * attraction;

        nodeA.vx += fx;
        nodeA.vy += fy;
        nodeB.vx -= fx;
        nodeB.vy -= fy;
      });

      // 3. Gravity center pull and velocity updates
      nodes.forEach(node => {
        if (dragNodeRef.current && dragNodeRef.current.id === node.id) return;

        node.vx -= node.x * gravity;
        node.vy -= node.y * gravity;

        node.vx *= damping;
        node.vy *= damping;

        node.x += node.vx;
        node.y += node.vy;

        nodePositionsRef.current.set(node.id, { x: node.x, y: node.y, vx: node.vx, vy: node.vy });
      });

      // 4. Strict Collision overlap resolution (Guarantees zero overlaps)
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        const minGapA = nodeA.size + 24; 
        
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          const minGapB = nodeB.size + 24;
          
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDistThreshold = minGapA + minGapB;

          if (dist < minDistThreshold) {
            const overlap = minDistThreshold - dist;
            const pushX = (dx / dist) * overlap * 0.55;
            const pushY = (dy / dist) * overlap * 0.55;

            nodeA.x -= pushX;
            nodeA.y -= pushY;
            nodeB.x += pushX;
            nodeB.y += pushY;

            nodeA.vx -= pushX * 0.15;
            nodeA.vy -= pushY * 0.15;
            nodeB.vx += pushX * 0.15;
            nodeB.vy += pushY * 0.15;

            nodePositionsRef.current.set(nodeA.id, { x: nodeA.x, y: nodeA.y, vx: nodeA.vx, vy: nodeA.vy });
            nodePositionsRef.current.set(nodeB.id, { x: nodeB.x, y: nodeB.y, vx: nodeB.vx, vy: nodeB.vy });
          }
        }
      }

      physicsTicksRef.current += 1;
      if (physicsTicksRef.current > 240) {
        physicsActiveRef.current = false; // Freeze physics settled
      }
    };

    const drawGraph = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const currentPan = panRef.current;
      const currentZoom = zoomRef.current;
      const currentSelectedNode = selectedNodeRef.current;
      const currentHoveredNode = hoveredNodeRef.current;
      const currentConfig = physicsConfigRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.translate(currentPan.x, currentPan.y);
      ctx.scale(currentZoom, currentZoom);

      // --- ADVANCED NEIGHBORHOOD FOCUS ISOLATION ---
      const focusNode = currentSelectedNode || currentHoveredNode;
      const connectedNodeIDs = new Set();
      
      if (focusNode) {
        connectedNodeIDs.add(focusNode.id);
        
        if (focusNode.type === 'tag') {
          const connectedJournals = focusNode.original.connectedIds || [];
          connectedJournals.forEach(id => connectedNodeIDs.add(id));
        } else if (focusNode.type === 'journal') {
          links.forEach(link => {
            if (link.source === focusNode.id) connectedNodeIDs.add(link.target);
            else if (link.target === focusNode.id) connectedNodeIDs.add(link.source);
          });
        }
      }

      // --- 1. Draw Links ---
      links.forEach(link => {
        const sourceNode = nodeMap.get(link.source);
        const targetNode = nodeMap.get(link.target);
        if (!sourceNode || !targetNode) return;

        let opacity = 0.18;
        let lineWidth = 1.2;
        let isLinkHighlighted = false;

        if (focusNode) {
          const isSourceConnected = connectedNodeIDs.has(sourceNode.id);
          const isTargetConnected = connectedNodeIDs.has(targetNode.id);
          const isRelatedToFocus = (sourceNode.id === focusNode.id || targetNode.id === focusNode.id);

          if (isSourceConnected && isTargetConnected && isRelatedToFocus) {
            opacity = 0.85;
            lineWidth = 2.4;
            isLinkHighlighted = true;
          } else {
            opacity = 0.015; 
          }
        } else {
          opacity = 0.22;
        }

        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);

        // Path draws gradient matching logs blue or tags yellow
        const lineColor = isLinkHighlighted ? 'rgba(56, 189, 248, 0.85)' : `rgba(255, 255, 255, ${opacity})`;

        ctx.strokeStyle = lineColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // Glowing particle traversal
        if (currentConfig.showParticles && (!focusNode || isLinkHighlighted) && opacity > 0.05) {
          const t = (Date.now() * 0.001 * currentConfig.particleSpeed) % 1;
          const px = sourceNode.x + (targetNode.x - sourceNode.x) * t;
          const py = sourceNode.y + (targetNode.y - sourceNode.y) * t;

          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = isLinkHighlighted ? 'hsl(199, 89%, 60%)' : 'rgba(56, 189, 248, 0.6)';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#38BDF8';
          ctx.fill();
          ctx.shadowBlur = 0; 
        }
      });

      // --- 2. Draw Nodes ---
      nodes.forEach(node => {
        // Unified colors: Journals get Blue, Tags get Yellow!
        const colorSet = node.type === 'tag' ? TAG_COLOR : JOURNAL_COLOR;
        
        let size = node.size;
        let opacity = 1;
        let isNodeHighlighted = false;

        const isCurrentSelected = currentSelectedNode && currentSelectedNode.id === node.id;
        const isCurrentHovered = currentHoveredNode && currentHoveredNode.id === node.id;

        if (focusNode) {
          if (connectedNodeIDs.has(node.id)) {
            opacity = 1;
            isNodeHighlighted = true;
            if (isCurrentSelected || isCurrentHovered) {
              size += 3.5;
            }
          } else {
            opacity = 0.08; 
            size *= 0.85;
          }
        } else {
          if (isCurrentHovered) {
            size += 3.5;
            isNodeHighlighted = true;
          }
        }

        // Draw dynamic glowing aura halo
        if (isNodeHighlighted && opacity > 0.1) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 8, 0, Math.PI * 2);
          ctx.fillStyle = colorSet.glow;
          ctx.shadowBlur = 20;
          ctx.shadowColor = colorSet.border;
          ctx.fill();
          ctx.shadowBlur = 0; 
        }

        // Base circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(15, 23, 42, ${opacity * 0.95})`; 
        ctx.fill();

        // Frosted border ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fillStyle = colorSet.fill.replace('0.25', (0.25 * opacity).toString()).replace('0.2', (0.2 * opacity).toString());
        ctx.strokeStyle = colorSet.border.replace(')', `, ${opacity})`).replace('hsl', 'hsla');
        ctx.lineWidth = isNodeHighlighted ? 2.5 : 1.5;
        ctx.fill();
        ctx.stroke();

        // High-Fidelity Vector Node Icon Illustrations!
        // Draws precise vector Tag shape for tags, and vector BookOpen shape for journals
        ctx.strokeStyle = colorSet.border.replace(')', `, ${opacity * 0.95})`).replace('hsl', 'hsla');
        ctx.lineWidth = 1.5;

        if (node.type === 'tag') {
          // Draw vector Tag icon tilted at -45 degrees (matches Lucide tag!)
          const ts = size * 0.38;
          ctx.save();
          ctx.translate(node.x, node.y);
          ctx.rotate(-Math.PI / 4);
          ctx.beginPath();
          ctx.moveTo(-ts, -ts * 0.5);
          ctx.lineTo(-ts * 0.5, -ts);
          ctx.lineTo(ts, -ts);
          ctx.lineTo(ts, ts);
          ctx.lineTo(-ts, ts);
          ctx.closePath();
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(-ts * 0.35, 0, size * 0.08, 0, Math.PI * 2);
          ctx.fillStyle = colorSet.border.replace(')', `, ${opacity * 0.95})`).replace('hsl', 'hsla');
          ctx.fill();
          ctx.restore();
        } else {
          // Draw vector BookOpen icon (matches Lucide book-open!)
          const w = size * 0.45;
          const h = size * 0.35;
          
          ctx.beginPath();
          // Left page curve
          ctx.moveTo(node.x - w, node.y - h);
          ctx.lineTo(node.x - w, node.y + h);
          ctx.quadraticCurveTo(node.x - w * 0.5, node.y + h * 0.7, node.x, node.y + h * 0.3);
          ctx.lineTo(node.x, node.y - h * 0.7);
          ctx.quadraticCurveTo(node.x - w * 0.5, node.y - h * 0.3, node.x - w, node.y - h);
          ctx.stroke();

          ctx.beginPath();
          // Right page curve
          ctx.moveTo(node.x + w, node.y - h);
          ctx.lineTo(node.x + w, node.y + h);
          ctx.quadraticCurveTo(node.x + w * 0.5, node.y + h * 0.7, node.x, node.y + h * 0.3);
          ctx.lineTo(node.x, node.y - h * 0.7);
          ctx.quadraticCurveTo(node.x + w * 0.5, node.y - h * 0.3, node.x + w, node.y - h);
          ctx.stroke();
        }

        // --- 3. Draw Node Labels ---
        const shouldShowText = (!focusNode && currentZoom > 0.45) || (focusNode && connectedNodeIDs.has(node.id));

        if (shouldShowText && opacity > 0.1) {
          ctx.font = isNodeHighlighted ? 'bold 11px sans-serif' : '10px sans-serif';
          ctx.fillStyle = colorSet.text.replace(')', `, ${opacity * 0.95})`).replace('hsl', 'hsla');
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          
          const text = node.label;
          const textWidth = ctx.measureText(text).width;
          
          ctx.fillStyle = `rgba(15, 23, 42, ${opacity * 0.7})`;
          ctx.fillRect(node.x - textWidth / 2 - 4, node.y + size + 4, textWidth + 8, 14);
          
          ctx.fillStyle = colorSet.text.replace(')', `, ${opacity * 0.95})`).replace('hsl', 'hsla');
          ctx.fillText(text, node.x, node.y + size + 6);
        }
      });

      ctx.restore();
    };

    const tick = () => {
      updatePhysics();
      drawGraph();
      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    return () => cancelAnimationFrame(animationFrameId);
  }, [nodes, links]); 

  const getCanvasCoords = (clientX, clientY) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - panRef.current.x) / zoomRef.current;
    const y = (clientY - rect.top - panRef.current.y) / zoomRef.current;
    return { x, y };
  };

  // --- Interaction Event Handlers ---

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; 
    
    const coords = getCanvasCoords(e.clientX, e.clientY);
    
    let clickedNode = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = node.x - coords.x;
      const dy = node.y - coords.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= node.size + 6) {
        clickedNode = node;
        break;
      }
    }

    if (clickedNode) {
      dragNodeRef.current = clickedNode;
      setSelectedNode(clickedNode);
      awakenPhysics(); 
    } else {
      isDraggingCanvasRef.current = true;
      dragStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
    }
  };

  const handleMouseMove = (e) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (dragNodeRef.current) {
      dragNodeRef.current.x = coords.x;
      dragNodeRef.current.y = coords.y;
      dragNodeRef.current.vx = 0;
      dragNodeRef.current.vy = 0;
      awakenPhysics(); 
      return;
    }

    if (isDraggingCanvasRef.current) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
      return;
    }

    let foundHoveredNode = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = node.x - coords.x;
      const dy = node.y - coords.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= node.size + 6) {
        foundHoveredNode = node;
        break;
      }
    }
    
    if (foundHoveredNode?.id !== hoveredNodeRef.current?.id) {
      setHoveredNode(foundHoveredNode);
    }
  };

  const handleMouseUp = () => {
    dragNodeRef.current = null;
    isDraggingCanvasRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.06;
    const newZoom = e.deltaY < 0 ? zoomRef.current * zoomFactor : zoomRef.current / zoomFactor;
    setZoom(Math.max(0.18, Math.min(2.5, newZoom)));
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const mockEvent = {
      button: 0,
      clientX: touch.clientX,
      clientY: touch.clientY
    };
    handleMouseDown(mockEvent);
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const mockEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY
    };
    handleMouseMove(mockEvent);
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  const filteredSearchNodes = useMemo(() => {
    return nodes.filter(n => {
      const matchesSearch = n.label.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || n.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [nodes, searchQuery, filterType]);

  const selectedNodeDetails = useMemo(() => {
    if (!selectedNode) return null;

    const relationships = {
      incoming: [], 
      outgoing: [], 
      tags: []
    };

    links.forEach(link => {
      if (link.source === selectedNode.id) {
        const targetNode = nodeMap.get(link.target);
        if (targetNode) {
          if (targetNode.type === 'tag') {
            relationships.tags.push(targetNode.label);
          } else {
            relationships.outgoing.push(targetNode);
          }
        }
      } else if (link.target === selectedNode.id) {
        const sourceNode = nodeMap.get(link.source);
        if (sourceNode && sourceNode.type !== 'tag') {
          relationships.incoming.push(sourceNode);
        }
      }
    });

    return relationships;
  }, [selectedNode, links, nodeMap]);

  return (
    <div className="second-brain-layout animate-fade-in" style={{
      display: 'grid',
      gridTemplateColumns: (isMobile || !isSidebarOpen) ? '1fr' : '320px 1fr',
      height: 'calc(100vh - var(--header-height, 60px))',
      transition: 'grid-template-columns 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      overflow: 'hidden',
      color: 'var(--text-primary)',
      backgroundColor: 'var(--bg-primary)',
      position: 'relative'
    }}>

      {/* Mobile background backdrop when drawer is open */}
      {isMobile && isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 14,
            transition: 'opacity 0.25s ease'
          }}
        />
      )}

      {/* --- SIDEBAR INDEX INDEX (Left Side) --- */}
      <aside className="glass-panel" style={{
        position: isMobile ? 'absolute' : 'relative',
        left: 0,
        top: 0,
        width: isMobile ? '280px' : '320px',
        borderRight: '1px solid var(--border-glass)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: isMobile ? 15 : 5,
        backgroundColor: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        transform: isSidebarOpen ? 'translateX(0)' : (isMobile ? 'translateX(-280px)' : 'translateX(-320px)'),
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <GitFork size={20} style={{ color: 'var(--color-accent)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.3px', margin: 0 }}>Mind Logs Graph</h3>
          </div>
          <button 
            className="secondary-btn icon-only-btn" 
            onClick={() => setIsSidebarOpen(false)}
            title="Collapse Sidebar"
            style={{ padding: '0.25rem', height: '28px', width: '28px' }}
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Action Description & Seeding Tools */}
        <div style={{ padding: '1.25rem 1.25rem 0.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          {/* Seeding & Purging Controls */}
          <div style={{ display: 'flex', gap: '0.45rem', width: '100%' }}>
            {hasSeedTestData ? (
              <button 
                className="secondary-btn danger-hover-btn" 
                onClick={() => handleClearTestData(false)}
                style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '0.35rem', padding: '0.55rem', borderRadius: '10px', fontSize: '0.78rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: 'hsl(0, 85%, 65%)' }}
              >
                <Trash2 size={13} /> Clear Test Data
              </button>
            ) : (
              <button 
                className="primary-btn" 
                onClick={handleSeedTestData}
                style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '0.35rem', padding: '0.55rem', borderRadius: '10px', fontSize: '0.78rem', background: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: '#fff' }}
              >
                <Database size={13} /> Seed Test Aura
              </button>
            )}
          </div>

          <div style={{
            fontSize: '0.78rem',
            lineHeight: '1.4',
            color: 'var(--text-muted)',
            padding: '0.65rem 0.8rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-glass)',
            borderRadius: '8px'
          }}>
            ⚡ **Click a Tag** to isolate its journals. **Click a Journal** to reveal its tags. Drag nodes to explore.
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search journals or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                fontSize: '0.82rem',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            />
          </div>
        </div>

        {/* View Mode Filters */}
        <div style={{ padding: '0 1.25rem 0.75rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'journal', label: 'Logs' },
              { id: 'tag', label: 'Tags' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                style={{
                  flex: 1,
                  background: filterType === tab.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.35rem 0',
                  fontSize: '0.72rem',
                  fontWeight: filterType === tab.id ? 700 : 500,
                  color: filterType === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Node Index List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem 1.25rem 1.25rem' }}>
          <h4 style={{ fontSize: '0.75rem', fontWeight: 650, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.65rem' }}>
            Index List ({filteredSearchNodes.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {filteredSearchNodes.map(node => {
              const colorSet = node.type === 'tag' ? TAG_COLOR : JOURNAL_COLOR;
              const isCurrentSelected = selectedNode && selectedNode.id === node.id;
              
              return (
                <div 
                  key={node.id}
                  onClick={() => {
                    setSelectedNode(node);
                    if (canvasRef.current) {
                      setPan({
                        x: canvasRef.current.width / 2 - node.x * zoomRef.current,
                        y: canvasRef.current.height / 2 - node.y * zoomRef.current
                      });
                    }
                  }}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isCurrentSelected ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    border: '1px solid',
                    borderColor: isCurrentSelected ? colorSet.border : 'transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                    {node.type === 'journal' ? (
                      <BookOpen size={13} style={{ color: colorSet.border, flexShrink: 0, filter: `drop-shadow(0 0 4px ${colorSet.border})` }} />
                    ) : (
                      <Tag size={13} style={{ color: colorSet.border, flexShrink: 0, filter: `drop-shadow(0 0 4px ${colorSet.border})` }} />
                    )}
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: isCurrentSelected ? 650 : 500,
                      color: isCurrentSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    }}>
                      {node.label}
                    </span>
                  </div>
                  <ChevronRight size={12} style={{ color: 'var(--text-muted)', opacity: isCurrentSelected ? 0.8 : 0.3 }} />
                </div>
              );
            })}
            
            {filteredSearchNodes.length === 0 && (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No active logs or tags match search.
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* --- Expand Sidebar Toggle Button --- */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          style={{
            position: 'absolute',
            left: '1.25rem',
            top: '1.25rem',
            zIndex: 10,
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            borderRadius: '10px',
            color: 'var(--text-primary)',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.25s'
          }}
          title="Expand Index Sidebar"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* --- CANVAS CANVAS SECTION (Center View) --- */}
      <section 
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          cursor: isDraggingCanvasRef.current ? 'grabbing' : 'grab',
          overflow: 'hidden'
        }}
      >
        <canvas 
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{ display: 'block', touchAction: 'none' }}
        />

        {/* Top Floating Glass Bar (Navigation & Legend) */}
        <div className="glass-panel animate-scale-up" style={{
          position: 'absolute',
          top: '1.25rem',
          right: '1.25rem',
          padding: '0.65rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-glass)',
          border: '1px solid var(--border-glass)',
          backdropFilter: 'blur(12px)',
          pointerEvents: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 8
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.15rem' }}>
            Graph Legend
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.75rem', fontWeight: 550 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <BookOpen size={12} style={{ color: JOURNAL_COLOR.border }} />
              <span style={{ color: 'var(--text-secondary)' }}>Journal Logs (Blue)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Tag size={12} style={{ color: TAG_COLOR.border }} />
              <span style={{ color: 'var(--text-secondary)' }}>Associated Tags (Yellow)</span>
            </div>
          </div>
        </div>

        {/* Floating Zoom & Control Widgets (Bottom Right) */}
        <div style={{
          position: 'absolute',
          bottom: '1.25rem',
          right: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          pointerEvents: 'auto',
          zIndex: 8
        }}>
          <div className="glass-panel animate-fade-in" style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            backdropFilter: 'blur(10px)',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <button 
              onClick={() => {
                const newZoom = Math.min(2.5, zoomRef.current * 1.2);
                setZoom(newZoom);
              }}
              style={{ width: '32px', height: '32px', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', borderBottom: '1px solid var(--border-glass)' }}
              title="Zoom In"
            >
              +
            </button>
            <button 
              onClick={recenterGraph}
              style={{ width: '32px', height: '32px', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-glass)' }}
              title="Recenter Camera & Unfreeze"
            >
              <RefreshCw size={12} />
            </button>
            <button 
              onClick={() => {
                const newZoom = Math.max(0.18, zoomRef.current / 1.2);
                setZoom(newZoom);
              }}
              style={{ width: '32px', height: '32px', border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}
              title="Zoom Out"
            >
              -
            </button>
          </div>
        </div>

        {/* --- NODE DETAIL BOTTOM CARD OVERLAY --- */}
        {selectedNode && (
          <div className="glass-panel animate-scale-up" style={{
            position: 'absolute',
            left: '0',
            right: '0',
            bottom: '1.25rem',
            margin: '0 auto',
            width: '92%',
            maxWidth: '540px',
            maxHeight: '340px',
            backgroundColor: 'var(--bg-glass)',
            border: '1px solid var(--border-glass-active)',
            borderRadius: '16px',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(25px)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            zIndex: 10,
            overflow: 'hidden'
          }}>
            {/* Top Close Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '0.25rem 0.55rem',
                  borderRadius: '6px',
                  letterSpacing: '0.3px',
                  backgroundColor: selectedNode.type === 'journal' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(251, 191, 36, 0.12)',
                  color: selectedNode.type === 'journal' ? 'hsl(199, 89%, 60%)' : 'hsl(45, 93%, 60%)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}>
                  {selectedNode.type === 'journal' ? <BookOpen size={10} /> : <Tag size={10} />}
                  {selectedNode.type}
                </span>
                {selectedNode.original.date && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    • {selectedNode.original.date}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.2rem'
                }}
              >
                ✕
              </button>
            </div>

            {/* Note Details Content */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              WebkitOverflowScrolling: 'touch', 
              touchAction: 'pan-y', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.65rem' 
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                {selectedNode.label}
              </h3>

              {/* Tag connections view (If Tag type) */}
              {selectedNode.type === 'tag' ? (
                <div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
                    Logs linked under <strong style={{ color: 'var(--color-accent)' }}>#{selectedNode.original.tag}</strong>:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {selectedNode.original.connectedIds.map(connId => {
                      const connNode = nodeMap.get(connId);
                      if (!connNode) return null;
                      return (
                        <span 
                          key={connId}
                          onClick={() => {
                            setSelectedNode(connNode);
                            awakenPhysics();
                          }}
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.25rem 0.55rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            transition: 'all 0.15s'
                          }}
                        >
                          {connNode.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  {/* Notes Excerpt Text Content */}
                  <p style={{
                    fontSize: '0.85rem',
                    lineHeight: '1.45',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    opacity: 0.9,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {selectedNode.original.content ? (
                      selectedNode.original.content.replace(/<\/?[^>]+(>|$)/g, "") 
                    ) : (
                      <em style={{ color: 'var(--text-muted)' }}>No additional thoughts written in this journal.</em>
                    )}
                  </p>

                  {/* Backlinks & Connections Row */}
                  {selectedNodeDetails && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem',
                      borderTop: '1px solid var(--border-glass)',
                      paddingTop: '0.65rem',
                      marginTop: '0.35rem'
                    }}>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                        {selectedNodeDetails.tags.length > 0 && (
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Linked Tags: </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.15rem' }}>
                              {selectedNodeDetails.tags.map(tLabel => (
                                <span 
                                  key={tLabel}
                                  onClick={() => {
                                    const tagClean = tLabel.replace('#', '').trim().toLowerCase();
                                    const tagNode = nodeMap.get(`tag-${tagClean}`);
                                    if (tagNode) {
                                      setSelectedNode(tagNode);
                                      awakenPhysics();
                                    }
                                  }} 
                                  style={{ color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }}
                                >
                                  {tLabel}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Actions Bar */}
            {selectedNode.type === 'journal' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '0.65rem' }}>
                <button 
                  className="secondary-btn" 
                  onClick={() => {
                    setSelectedNode(null);
                    onEditEntry(selectedNode.id);
                  }}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Edit size={12} /> Edit Journal Log
                </button>
              </div>
            )}
          </div>
        )}
      </section>
      
    </div>
  );
}
