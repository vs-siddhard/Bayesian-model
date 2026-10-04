import React, { useState, useEffect, useRef } from 'react';
import {
  GitFork,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  Table as TableIcon,
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { NetworkGraphData, NetworkNode, CPTData } from '../types';

export const BayesianNetworkPage: React.FC = () => {
  const [networkData, setNetworkData] = useState<NetworkGraphData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('heart_disease_risk');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 30, y: 30 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const data = await apiService.getNetwork();
        setNetworkData(data);

        const initialPos: Record<string, { x: number; y: number }> = {};
        data.nodes.forEach((n, idx) => {
          initialPos[n.id] = {
            x: n.x ?? 120 + (idx % 3) * 240,
            y: n.y ?? 80 + Math.floor(idx / 3) * 120,
          };
        });
        setNodePositions(initialPos);
      } catch (err) {
        console.error('Failed to load network graph data:', err);
      }
    };
    fetchGraph();
  }, []);

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(2.0, Math.max(0.4, prev + delta)));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 30, y: 30 });
    if (networkData) {
      const initialPos: Record<string, { x: number; y: number }> = {};
      networkData.nodes.forEach(n => {
        initialPos[n.id] = { x: n.x ?? 200, y: n.y ?? 100 };
      });
      setNodePositions(initialPos);
    }
  };

  const selectedNode = networkData?.nodes.find(n => n.id === selectedNodeId) || null;
  const selectedCPT: CPTData | null =
    selectedNodeId && networkData?.cpts ? networkData.cpts[selectedNodeId] : null;

  const incomingNodeIds = selectedNode?.parents || [];
  const outgoingNodeIds = selectedNode?.children || [];

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as HTMLElement).tagName === 'svg') {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else if (draggedNode && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - pan.x) / zoom;
      const currentY = (e.clientY - rect.top - pan.y) / zoom;
      setNodePositions(prev => ({
        ...prev,
        [draggedNode]: { x: currentX, y: currentY },
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggedNode(null);
  };

  const getCategoryColor = (category: string, isTarget: boolean) => {
    if (isTarget) return { border: '#f43f5e', fill: '#280612', text: '#fda4af' };
    if (category === 'Risk Factor') return { border: '#38bdf8', fill: '#082f49', text: '#bae6fd' };
    if (category === 'Physiological Marker') return { border: '#fbbf24', fill: '#2e1903', text: '#fde68a' };
    return { border: '#34d399', fill: '#042f21', text: '#a7f3d0' };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Simple Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <GitFork className="w-4 h-4 text-cyan-400" />
            <span>Bayesian Network Graph & CPT Explorer</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Directed Acyclic Graph (DAG) visualizing conditional dependencies and local probability tables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(0.15)}
            className="p-1.5 rounded bg-[#0b101b] border border-slate-800 hover:bg-slate-800 text-slate-300"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(-0.15)}
            className="p-1.5 rounded bg-[#0b101b] border border-slate-800 hover:bg-slate-800 text-slate-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetView}
            className="px-2.5 py-1.5 rounded bg-[#0b101b] border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Graph Stage (8 cols) */}
        <div className="lg:col-span-8 bg-[#070a10] border border-slate-800/80 rounded-lg overflow-hidden flex flex-col h-[560px] relative">
          {/* Subtle Legend Ribbon */}
          <div className="px-4 py-2 bg-[#0b101b] border-b border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">Tiers:</span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span> Risk Factor
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> Vitals
              </span>
              <span className="flex items-center gap-1 text-rose-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span> Target
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Symptom
              </span>
            </div>
            <span className="text-slate-400">Click node to inspect</span>
          </div>

          {/* SVG Canvas */}
          <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden">
            <svg
              ref={svgRef}
              className="w-full h-full"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <defs>
                <marker
                  id="arrow-simple"
                  viewBox="0 0 10 10"
                  refX="17"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                </marker>
                <marker
                  id="arrow-active-simple"
                  viewBox="0 0 10 10"
                  refX="17"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
                </marker>
              </defs>

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Edges */}
                {networkData?.edges.map(edge => {
                  const sourcePos = nodePositions[edge.source] || { x: 0, y: 0 };
                  const targetPos = nodePositions[edge.target] || { x: 0, y: 0 };
                  const isHighlighted =
                    edge.source === selectedNodeId || edge.target === selectedNodeId;

                  const dx = targetPos.x - sourcePos.x;
                  const cx1 = sourcePos.x + dx * 0.5;
                  const cy1 = sourcePos.y;
                  const cx2 = sourcePos.x + dx * 0.5;
                  const cy2 = targetPos.y;

                  return (
                    <path
                      key={edge.id}
                      d={`M ${sourcePos.x} ${sourcePos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${targetPos.x} ${targetPos.y}`}
                      fill="none"
                      stroke={isHighlighted ? '#06b6d4' : '#334155'}
                      strokeWidth={isHighlighted ? 2 : 1.2}
                      markerEnd={isHighlighted ? 'url(#arrow-active-simple)' : 'url(#arrow-simple)'}
                      className="transition-colors duration-150"
                    />
                  );
                })}

                {/* Nodes */}
                {networkData?.nodes.map(node => {
                  const pos = nodePositions[node.id] || { x: 0, y: 0 };
                  const isSelected = node.id === selectedNodeId;
                  const color = getCategoryColor(node.category, node.isTarget);

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      className="cursor-pointer select-none"
                      onMouseDown={e => {
                        e.stopPropagation();
                        setDraggedNode(node.id);
                        setSelectedNodeId(node.id);
                      }}
                    >
                      <rect
                        x="-70"
                        y="-22"
                        width="140"
                        height="44"
                        rx="6"
                        fill={color.fill}
                        stroke={isSelected ? '#06b6d4' : color.border}
                        strokeWidth={isSelected ? 2.5 : 1}
                        className="transition-all duration-150"
                      />
                      <text
                        x="0"
                        y="-6"
                        textAnchor="middle"
                        fill={color.text}
                        fontSize="8px"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        {node.isTarget ? 'TARGET' : node.category.toUpperCase()}
                      </text>
                      <text
                        x="0"
                        y="10"
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="11px"
                        fontWeight="600"
                        fontFamily="sans-serif"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>

        {/* CPT Inspector (4 cols) */}
        <div className="lg:col-span-4 bg-[#0b101b] border border-slate-800/70 rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <TableIcon className="w-3.5 h-3.5 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  CPT Distribution
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">P(X | Parents)</span>
            </div>

            {selectedNode ? (
              <div className="space-y-3 mt-3 text-xs">
                {/* Node Summary */}
                <div className="p-3 bg-[#070a10] rounded border border-slate-800/70 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">{selectedNode.label}</span>
                    <span className="text-[10px] font-mono text-slate-400">{selectedNode.category}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Parents: {selectedNode.parents.length > 0 ? selectedNode.parents.join(', ') : 'None (Root Node)'}
                  </div>
                </div>

                {/* Formatted Probability Table */}
                <div className="max-h-60 overflow-auto border border-slate-800/70 rounded">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-[#070a10] text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2 font-normal">State</th>
                        <th className="p-2 font-normal">Probability</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {selectedNode.states.map((st, idx) => {
                        let probVal = '—';
                        if (selectedCPT && Array.isArray(selectedCPT.values)) {
                          if (typeof selectedCPT.values[idx] === 'number') {
                            probVal = `${((selectedCPT.values[idx] as number) * 100).toFixed(1)}%`;
                          } else if (Array.isArray(selectedCPT.values[idx])) {
                            const row = selectedCPT.values[idx] as number[];
                            probVal = row
                              .slice(0, 2)
                              .map(v => `${(v * 100).toFixed(0)}%`)
                              .join(', ');
                            if (row.length > 2) probVal += '...';
                          }
                        }
                        return (
                          <tr key={st} className="hover:bg-slate-900/50">
                            <td className="p-2 font-semibold text-slate-200">{st}</td>
                            <td className="p-2 font-bold text-cyan-300 tabular-nums">{probVal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Select a node to inspect its local probability distribution.
              </div>
            )}
          </div>

          <div className="p-3 bg-[#070a10] rounded border border-slate-800/60 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-200 block mb-0.5">Statistical Dependency</span>
            Directed edges formalize conditional independence in data factorization, not verified medical causality.
          </div>
        </div>
      </div>
    </div>
  );
};
