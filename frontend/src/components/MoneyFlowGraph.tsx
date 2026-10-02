import React, { useState, useMemo } from 'react';
import type { MoneyTrailEdge, GraphNode } from '../api';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface MoneyFlowGraphProps {
  nodes?: GraphNode[];
  edges: MoneyTrailEdge[];
  victimAccount: string;
  selectedHop: number;
  onSelectHop: (hop: number) => void;
  onSelectAccount?: (account: string) => void;
}

export const MoneyFlowGraph: React.FC<MoneyFlowGraphProps> = ({
  nodes: _nodes,
  edges,
  victimAccount,
  selectedHop,
  onSelectHop,
  onSelectAccount,
}) => {
  const [zoom, setZoom] = useState(1);
  const [minAmountFilter, setMinAmountFilter] = useState<number>(0);

  // Filter edges based on selected hop depth and minimum amount
  const filteredEdges = useMemo(() => {
    return edges.filter(
      (e) => e.hop <= selectedHop && (minAmountFilter === 0 || e.amount >= minAmountFilter)
    );
  }, [edges, selectedHop, minAmountFilter]);

  // Compute layered X coordinates by hop level (0 = victim, 1..4 = hops)
  const layout = useMemo(() => {
    const columns: Record<number, string[]> = { 0: [victimAccount], 1: [], 2: [], 3: [], 4: [] };
    const accountHops: Record<string, number> = { [victimAccount]: 0 };

    filteredEdges.forEach((e) => {
      if (!accountHops[e.to_account] || accountHops[e.to_account] > e.hop) {
        accountHops[e.to_account] = e.hop;
      }
    });

    Object.entries(accountHops).forEach(([acc, hop]) => {
      if (acc !== victimAccount && hop <= 4) {
        if (!columns[hop]) columns[hop] = [];
        if (!columns[hop].includes(acc)) columns[hop].push(acc);
      }
    });

    const positions: Record<string, { x: number; y: number; hop: number }> = {};
    const colWidth = 240;
    const canvasHeight = 440;

    Object.entries(columns).forEach(([hopStr, accs]) => {
      const h = parseInt(hopStr, 10);
      const x = 90 + h * colWidth;
      const count = accs.length;
      accs.forEach((acc, idx) => {
        const spacing = canvasHeight / (count + 1);
        const y = spacing * (idx + 1);
        positions[acc] = { x, y, hop: h };
      });
    });

    return positions;
  }, [filteredEdges, victimAccount]);

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
      {/* Top Graph Controls Bar matching Stitch */}
      <div className="px-4 py-2.5 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
          <span className="font-headline-md text-[13px] font-bold text-on-surface">Directional Money-Flow Graph</span>
          <span className="text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded font-data-mono">
            {filteredEdges.length} active edges
          </span>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-md p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
              className="p-1 hover:bg-surface-container text-on-surface-variant hover:text-on-surface rounded"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[10px] font-data-mono px-1.5 text-on-surface-variant font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
              className="p-1 hover:bg-surface-container text-on-surface-variant hover:text-on-surface rounded"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 hover:bg-surface-container text-on-surface-variant hover:text-on-surface rounded"
              title="Reset View"
            >
              <Maximize2 size={14} />
            </button>
          </div>

          {/* Depth Selector Tabs: Hop 1 - Hop 4 */}
          <div className="flex items-center gap-1 bg-surface-container-lowest border border-outline-variant/40 p-0.5 rounded-lg text-[11px] font-data-mono font-semibold">
            <span className="text-[10px] text-on-surface-variant px-1.5 uppercase tracking-wide">DEPTH:</span>
            {[1, 2, 3, 4].map((h) => (
              <button
                key={h}
                onClick={() => onSelectHop(h)}
                className={`px-2.5 py-1 rounded transition-all ${
                  selectedHop === h
                    ? 'bg-primary-container text-on-primary shadow-sm font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                Hop {h}
              </button>
            ))}
          </div>

          {/* Volume Threshold Filter */}
          <select
            value={minAmountFilter}
            onChange={(e) => setMinAmountFilter(Number(e.target.value))}
            className="text-[11px] font-data-mono bg-surface-container-lowest border border-outline-variant/40 rounded-md px-2 py-1 text-on-surface focus:outline-none"
          >
            <option value="0">All Amounts</option>
            <option value="10000">Filter ≥ ₹10K</option>
            <option value="50000">Filter ≥ ₹50K</option>
            <option value="100000">Filter ≥ ₹1.0L</option>
          </select>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative h-[440px] bg-slate-50/50 overflow-hidden select-none">
        {filteredEdges.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-on-surface-variant gap-2">
            <span className="material-symbols-outlined text-[36px] text-outline">account_tree</span>
            <p className="text-[13px] font-medium">No directional money flow detected for current criteria.</p>
            <span className="text-[11px] text-outline">Execute a trace or adjust hop / volume filters above.</span>
          </div>
        ) : (
          <svg
            className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-200"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            viewBox="0 0 1100 440"
          >
            <defs>
              {/* Directed Arrow Markers */}
              <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#131b2e" />
              </marker>
              <marker id="arrow-cycle" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626" />
              </marker>
            </defs>

            {/* Edge Lines */}
            {filteredEdges.map((edge) => {
              const fromPos = layout[edge.from_account];
              const toPos = layout[edge.to_account];
              if (!fromPos || !toPos) return null;

              // Cubic bezier curve between nodes
              const dx = toPos.x - fromPos.x;
              const pathD = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x + dx * 0.5} ${fromPos.y}, ${toPos.x - dx * 0.5} ${toPos.y}, ${toPos.x} ${toPos.y}`;

              const midX = (fromPos.x + toPos.x) / 2;
              const midY = (fromPos.y + toPos.y) / 2 - 8;

              return (
                <g key={edge.record_id} className="group">
                  <path
                    d={pathD}
                    fill="none"
                    stroke={edge.is_cycle ? '#dc2626' : '#2563eb'}
                    strokeWidth={Math.min(4, Math.max(1.5, Math.log10(edge.amount + 1) * 0.8))}
                    strokeDasharray={edge.is_cycle ? '4 3' : undefined}
                    markerEnd={edge.is_cycle ? 'url(#arrow-cycle)' : 'url(#arrow)'}
                    className="opacity-75 group-hover:opacity-100 group-hover:stroke-indigo-600 transition-opacity"
                  />
                  {/* Amount Pill */}
                  <rect
                    x={midX - 32}
                    y={midY - 9}
                    width={64}
                    height={16}
                    rx={3}
                    fill="#ffffff"
                    stroke={edge.is_cycle ? '#fca5a5' : '#bfdbfe'}
                    strokeWidth={1}
                    className="shadow-sm"
                  />
                  <text
                    x={midX}
                    y={midY + 2.5}
                    textAnchor="middle"
                    className="text-[9px] font-data-mono font-bold fill-slate-800"
                  >
                    ₹{edge.amount >= 100000 ? `${(edge.amount / 100000).toFixed(1)}L` : `${Math.round(edge.amount / 1000)}k`}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {Object.entries(layout).map(([account, pos]) => {
              const isVictim = account === victimAccount;
              return (
                <g
                  key={account}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer group"
                  onClick={() => onSelectAccount && onSelectAccount(account)}
                >
                  {/* Glow effect on hover */}
                  <circle
                    r={isVictim ? 26 : 22}
                    fill={isVictim ? '#fee2e2' : '#eff6ff'}
                    stroke={isVictim ? '#ef4444' : '#3b82f6'}
                    strokeWidth={isVictim ? 2.5 : 2}
                    className="shadow-sm group-hover:stroke-indigo-600 group-hover:r-24 transition-all"
                  />
                  {/* Center Icon */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={`material-symbols-outlined text-[15px] ${isVictim ? 'fill-rose-700' : 'fill-blue-700'}`}
                  >
                    {isVictim ? 'person' : 'account_balance'}
                  </text>

                  {/* Account Badge below */}
                  <rect
                    x={-55}
                    y={isVictim ? 30 : 26}
                    width={110}
                    height={18}
                    rx={4}
                    fill="#131b2e"
                    className="shadow-sm"
                  />
                  <text
                    x={0}
                    y={isVictim ? 42 : 38}
                    textAnchor="middle"
                    className="text-[9px] font-data-mono font-medium fill-white"
                  >
                    {isVictim ? `★ ${account.slice(0, 11)}` : account.slice(0, 12)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Legend & Forensic Attribution Info */}
      <div className="px-4 py-2 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between text-[11px] text-on-surface-variant font-data-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Victim Origin (★)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Attributed Beneficiary
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-600 border-dashed" />
            Detected Cycle
          </span>
        </div>
        <span>Conservative Lineage Attribution • Double-Count Prevention Active</span>
      </div>
    </div>
  );
};
