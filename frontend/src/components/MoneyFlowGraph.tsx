import React, { useState, useMemo } from 'react';
import type { MoneyTrailEdge, GraphNode } from '../api';
import { ZoomIn, ZoomOut, Maximize2, ShieldAlert, ArrowDownLeft, ArrowUpRight, Clock } from 'lucide-react';

interface MoneyFlowGraphProps {
  nodes?: (GraphNode | string)[];
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
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [flowFilter, setFlowFilter] = useState<'all' | 'inflow' | 'outflow'>('all');

  // Filter edges based on flow direction, hop depth, and minimum amount
  const filteredEdges = useMemo(() => {
    return edges.filter((e) => {
      const isUpstream = e.direction === 'upstream' || e.to_account === victimAccount;

      // Filter by flow mode
      if (flowFilter === 'inflow' && !isUpstream) return false;
      if (flowFilter === 'outflow' && isUpstream) return false;

      // Filter by amount
      if (minAmountFilter > 0 && e.amount < minAmountFilter) return false;

      // Filter by hop (upstream edges are direct sources; downstream respect selectedHop)
      if (!isUpstream && e.hop > selectedHop) return false;

      return true;
    });
  }, [edges, selectedHop, minAmountFilter, flowFilter, victimAccount]);

  // Counts for UI filters
  const counts = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    edges.forEach((e) => {
      if (e.direction === 'upstream' || e.to_account === victimAccount) {
        inflow++;
      } else {
        outflow++;
      }
    });
    return { inflow, outflow, total: edges.length };
  }, [edges, victimAccount]);

  // Bank institution code helper
  const getBankCode = (accId: string) => {
    const prefix = accId.slice(0, 4).toUpperCase();
    const bankMap: Record<string, string> = {
      SBIN: 'SBI',
      HDFC: 'HDFC',
      ICIC: 'ICICI',
      KKBK: 'KOTAK',
      PUNB: 'PNB',
      BARB: 'BOB',
      AIRP: 'AIRTEL',
      PYTM: 'PAYTM',
      IPOS: 'IPPB',
      AXIS: 'AXIS',
    };
    return bankMap[prefix] || prefix.slice(0, 4) || 'ACC';
  };

  // Compute layered X coordinates:
  // Column -1: Inflows (accounts that transferred money into this ID)
  // Column  0: Investigated Target ID (focal account)
  // Column  1..4: Transferred Beneficiary Accounts (Hop 1..4)
  const { positions, dynamicHeight, canvasWidth, columns, minCol } = useMemo(() => {
    const cols: Record<number, string[]> = {
      [-1]: [],
      0: [victimAccount],
      1: [],
      2: [],
      3: [],
      4: [],
    };
    const accountCols: Record<string, number> = { [victimAccount]: 0 };

    // 1. Identify all upstream senders (sources sending into victimAccount)
    filteredEdges.forEach((e) => {
      const isUpstream = e.direction === 'upstream' || e.to_account === victimAccount;
      if (isUpstream && e.from_account !== victimAccount) {
        accountCols[e.from_account] = -1;
      }
    });

    // 2. Identify all downstream recipients across hops 1..4
    filteredEdges.forEach((e) => {
      const isUpstream = e.direction === 'upstream' || e.to_account === victimAccount;
      if (!isUpstream && e.to_account !== victimAccount) {
        const hop = Math.min(4, Math.max(1, e.hop));
        if (accountCols[e.to_account] === undefined || accountCols[e.to_account] > hop) {
          accountCols[e.to_account] = hop;
        }
      }
    });

    // 3. Fallback for counterparties on multi-hop intermediate edges
    filteredEdges.forEach((e) => {
      if (accountCols[e.from_account] === undefined) {
        accountCols[e.from_account] = Math.max(0, e.hop - 1);
      }
      if (accountCols[e.to_account] === undefined) {
        accountCols[e.to_account] = Math.min(4, Math.max(1, e.hop));
      }
    });

    // 4. Also map any extra nodes passed via `nodes` prop
    if (_nodes && Array.isArray(_nodes)) {
      _nodes.forEach((nodeItem) => {
        const nodeId = typeof nodeItem === 'string' ? nodeItem : nodeItem.id;
        if (nodeId && accountCols[nodeId] === undefined) {
          if (nodeId !== victimAccount) {
            accountCols[nodeId] = 1;
          }
        }
      });
    }

    // Populate columns
    Object.entries(accountCols).forEach(([acc, col]) => {
      if (acc === victimAccount) return;
      if (!cols[col]) cols[col] = [];
      if (!cols[col].includes(acc)) cols[col].push(acc);
    });

    const activeCols = Object.keys(cols)
      .map(Number)
      .filter((c) => cols[c] && cols[c].length > 0);
    const minC = activeCols.length > 0 ? Math.min(...activeCols) : 0;
    const maxC = activeCols.length > 0 ? Math.max(...activeCols) : 0;

    // Height calculation based on max nodes in any single column
    const maxInCol = Math.max(1, ...Object.values(cols).map((c) => c.length));
    const nodeSpacing = 84;
    const computedHeight = Math.max(500, (maxInCol + 1) * nodeSpacing);

    const posMap: Record<string, { x: number; y: number; col: number }> = {};
    const colWidth = 240;
    const leftMargin = 130;

    Object.entries(cols).forEach(([colStr, accs]) => {
      const col = parseInt(colStr, 10);
      if (accs.length === 0) return;
      const x = leftMargin + (col - minC) * colWidth;
      const count = accs.length;
      accs.forEach((acc, idx) => {
        const spacing = computedHeight / (count + 1);
        const y = spacing * (idx + 1);
        posMap[acc] = { x, y, col };
      });
    });

    const computedWidth = Math.max(1160, 240 + (maxC - minC + 1) * colWidth);

    return {
      positions: posMap,
      dynamicHeight: computedHeight,
      canvasWidth: computedWidth,
      columns: cols,
      minCol: minC,
      maxCol: maxC,
    };
  }, [filteredEdges, victimAccount, _nodes]);

  // Aggregate stats & chronological timespan per node
  const nodeStats = useMemo(() => {
    const rawMap: Record<
      string,
      {
        inAmt: number;
        outAmt: number;
        inCount: number;
        outCount: number;
        timestamps: number[];
      }
    > = {};

    edges.forEach((e) => {
      if (!rawMap[e.from_account]) {
        rawMap[e.from_account] = { inAmt: 0, outAmt: 0, inCount: 0, outCount: 0, timestamps: [] };
      }
      if (!rawMap[e.to_account]) {
        rawMap[e.to_account] = { inAmt: 0, outAmt: 0, inCount: 0, outCount: 0, timestamps: [] };
      }

      rawMap[e.from_account].outAmt += e.amount || 0;
      rawMap[e.from_account].outCount += 1;

      rawMap[e.to_account].inAmt += e.amount || 0;
      rawMap[e.to_account].inCount += 1;

      if (e.timestamp) {
        const clean = String(e.timestamp).trim().replace(' ', 'T');
        const t = new Date(clean).getTime();
        if (!isNaN(t)) {
          rawMap[e.from_account].timestamps.push(t);
          rawMap[e.to_account].timestamps.push(t);
        }
      }
    });

    const stats: Record<
      string,
      {
        inAmt: number;
        outAmt: number;
        inCount: number;
        outCount: number;
        timespanStr: string;
        rangeStr: string;
        startDateStr: string;
        endDateStr: string;
      }
    > = {};

    Object.entries(rawMap).forEach(([acc, val]) => {
      val.timestamps.sort((a, b) => a - b);
      const firstT = val.timestamps.length > 0 ? new Date(val.timestamps[0]) : null;
      const lastT = val.timestamps.length > 0 ? new Date(val.timestamps[val.timestamps.length - 1]) : null;

      let timespanStr = 'Single Event';
      let rangeStr = 'Timeline not recorded';
      let startDateStr = '—';
      let endDateStr = '—';

      if (firstT && lastT) {
        const diffMs = Math.abs(lastT.getTime() - firstT.getTime());
        const fmt = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);
        startDateStr = fmt(firstT);
        endDateStr = fmt(lastT);

        if (diffMs === 0) {
          timespanStr = 'Single Instant / 0s';
          rangeStr = startDateStr;
        } else {
          const totalSec = Math.floor(diffMs / 1000);
          const totalMin = Math.floor(totalSec / 60);
          const totalHrs = Math.floor(totalMin / 60);
          const days = Math.floor(totalHrs / 24);
          const hrs = totalHrs % 24;
          const mins = totalMin % 60;
          const secs = totalSec % 60;

          const parts: string[] = [];
          if (days > 0) parts.push(`${days}d`);
          if (hrs > 0) parts.push(`${hrs}h`);
          if (mins > 0 && days === 0) parts.push(`${mins}m`);
          if (parts.length === 0) parts.push(`${secs}s`);

          timespanStr = parts.join(' ');
          rangeStr = `${startDateStr} → ${endDateStr}`;
        }
      }

      stats[acc] = {
        inAmt: val.inAmt,
        outAmt: val.outAmt,
        inCount: val.inCount,
        outCount: val.outCount,
        timespanStr,
        rangeStr,
        startDateStr,
        endDateStr,
      };
    });

    return stats;
  }, [edges]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Top Graph Controls Bar */}
      <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
          </span>
          <span className="font-bold text-xs text-slate-900 tracking-tight">
            360° Money-Flow &amp; Lineage Graph
          </span>
          <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono font-medium">
            {filteredEdges.length} active edges • {Object.keys(positions).length} accounts
          </span>
        </div>

        {/* View Mode Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFlowFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              flowFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Flow ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setFlowFilter('inflow')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              flowFilter === 'inflow'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <ArrowDownLeft size={13} />
            <span>Inflows ({counts.inflow})</span>
          </button>
          <button
            type="button"
            onClick={() => setFlowFilter('outflow')}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              flowFilter === 'outflow'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            <ArrowUpRight size={13} />
            <span>Transfers ({counts.outflow})</span>
          </button>
        </div>

        {/* Action Controls & Depth Filters */}
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-mono px-2 text-slate-600 font-semibold">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
              className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
              title="Reset Zoom"
            >
              <Maximize2 size={13} />
            </button>
          </div>

          {/* Depth Selector Tabs: Hop 1 - Hop 4 */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-0.5 rounded-lg text-xs font-semibold">
            <span className="text-[10px] text-slate-400 px-1.5 uppercase font-bold tracking-wider">
              DEPTH:
            </span>
            {[1, 2, 3, 4].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onSelectHop(h)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  selectedHop === h
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
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
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="0">All Amounts</option>
            <option value="10000">Filter ≥ ₹10K</option>
            <option value="50000">Filter ≥ ₹50K</option>
            <option value="100000">Filter ≥ ₹1.0L</option>
          </select>
        </div>
      </div>

      {/* SVG Canvas Area with dynamic height & smooth scroll */}
      <div className="relative h-[500px] bg-slate-50/70 overflow-auto select-none">
        {filteredEdges.length === 0 && Object.keys(positions).length <= 1 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-xs">
              <ShieldAlert size={22} />
            </div>
            <p className="text-xs font-bold text-slate-700">No transaction trail found for this node.</p>
            <span className="text-[11px] text-slate-400">Execute a trace or adjust hop / volume threshold above.</span>
          </div>
        ) : (
          <svg
            className="cursor-grab active:cursor-grabbing transition-transform duration-200"
            style={{
              width: `${canvasWidth * zoom}px`,
              height: `${dynamicHeight * zoom}px`,
              transformOrigin: 'top left',
            }}
            viewBox={`0 0 ${canvasWidth} ${dynamicHeight}`}
          >
            <defs>
              {/* Directed Arrow Markers */}
              <marker
                id="arrow-outflow"
                viewBox="0 0 10 10"
                refX="24"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
              </marker>

              <marker
                id="arrow-inflow"
                viewBox="0 0 10 10"
                refX="24"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
              </marker>

              <marker
                id="arrow-cycle"
                viewBox="0 0 10 10"
                refX="24"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
              </marker>
            </defs>

            {/* Column Headers at the top */}
            {Object.entries(columns).map(([colStr, accs]) => {
              const col = parseInt(colStr, 10);
              if (accs.length === 0) return null;
              const x = 130 + (col - minCol) * 240;
              const isUpstream = col < 0;
              const isTarget = col === 0;

              const headerTitle = isUpstream
                ? 'INFLOW SOURCES'
                : isTarget
                ? 'TARGET ACCOUNT'
                : `HOP ${col} (TRANSFERS)`;

              const bgColor = isUpstream ? '#ecfdf5' : isTarget ? '#fef3c7' : '#eff6ff';
              const borderColor = isUpstream ? '#a7f3d0' : isTarget ? '#fde68a' : '#bfdbfe';
              const textColor = isUpstream ? '#065f46' : isTarget ? '#92400e' : '#1e40af';

              return (
                <g key={col} transform={`translate(${x}, 24)`}>
                  <rect
                    x={-68}
                    y={-14}
                    width={136}
                    height={25}
                    rx={12}
                    fill={bgColor}
                    stroke={borderColor}
                    strokeWidth={1}
                  />
                  <text
                    x={0}
                    y={3}
                    textAnchor="middle"
                    fill={textColor}
                    className="text-[10px] font-mono font-bold tracking-tight"
                  >
                    {headerTitle}
                  </text>
                </g>
              );
            })}

            {/* Edge Lines */}
            {filteredEdges.map((edge) => {
              const fromPos = positions[edge.from_account];
              const toPos = positions[edge.to_account];
              if (!fromPos || !toPos) return null;

              const isUpstream = edge.direction === 'upstream' || toPos.col === 0 && fromPos.col < 0;
              const strokeColor = edge.is_cycle ? '#ef4444' : isUpstream ? '#059669' : '#3b82f6';
              const markerId = edge.is_cycle
                ? 'url(#arrow-cycle)'
                : isUpstream
                ? 'url(#arrow-inflow)'
                : 'url(#arrow-outflow)';

              // Smooth cubic bezier curve between nodes
              const dx = toPos.x - fromPos.x;
              const pathD = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x + dx * 0.45} ${fromPos.y}, ${toPos.x - dx * 0.45} ${toPos.y}, ${toPos.x} ${toPos.y}`;

              const midX = (fromPos.x + toPos.x) / 2;
              const midY = (fromPos.y + toPos.y) / 2 - 8;

              return (
                <g key={edge.record_id} className="group">
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={Math.min(3.5, Math.max(1.5, Math.log10(edge.amount + 1) * 0.75))}
                    strokeDasharray={edge.is_cycle ? '4 3' : undefined}
                    markerEnd={markerId}
                    className="opacity-75 group-hover:opacity-100 transition-opacity"
                  />
                  {/* Amount Pill Badge */}
                  <rect
                    x={midX - 32}
                    y={midY - 9}
                    width={64}
                    height={18}
                    rx={5}
                    fill="#ffffff"
                    stroke={edge.is_cycle ? '#fca5a5' : isUpstream ? '#a7f3d0' : '#cbd5e1'}
                    strokeWidth={1}
                    className="shadow-xs"
                  />
                  <text
                    x={midX}
                    y={midY + 3.5}
                    textAnchor="middle"
                    className={`text-[9px] font-mono font-bold ${
                      edge.is_cycle ? 'fill-rose-700' : isUpstream ? 'fill-emerald-700' : 'fill-slate-800'
                    }`}
                  >
                    {isUpstream ? '+' : ''}₹{edge.amount >= 100000 ? `${(edge.amount / 100000).toFixed(1)}L` : `${Math.round(edge.amount / 1000)}k`}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {Object.entries(positions).map(([account, pos]) => {
              const isTarget = account === victimAccount;
              const isUpstream = pos.col < 0;
              const bankCode = getBankCode(account);
              const isHovered = hoveredNode === account;
              const stats = nodeStats[account] || { inAmt: 0, outAmt: 0, inCount: 0, outCount: 0 };

              // Ring and fill styling
              let circleFill = '#ffffff';
              let circleStroke = '#3b82f6';
              let badgeFill = '#0f172a';
              let badgeText = `${bankCode}:${account.slice(-5)}`;

              if (isTarget) {
                circleFill = '#fef3c7';
                circleStroke = '#d97706';
                badgeFill = '#78350f';
                badgeText = `★ TARGET: ${account.slice(0, 10)}`;
              } else if (isUpstream) {
                circleFill = isHovered ? '#d1fae5' : '#ecfdf5';
                circleStroke = '#059669';
                badgeFill = '#065f46';
                badgeText = `SRC: ${bankCode}:${account.slice(-5)}`;
              } else if (isHovered) {
                circleFill = '#dbeafe';
                circleStroke = '#1d4ed8';
              }

              return (
                <g
                  key={account}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer group"
                  onClick={() => onSelectAccount && onSelectAccount(account)}
                  onMouseEnter={() => setHoveredNode(account)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Subtle outer glow when hovered */}
                  {isHovered && (
                    <circle
                      r={isTarget ? 30 : 25}
                      fill="none"
                      stroke={isTarget ? '#f59e0b' : isUpstream ? '#10b981' : '#3b82f6'}
                      strokeWidth={2}
                      opacity={0.4}
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    r={isTarget ? 24 : 20}
                    fill={circleFill}
                    stroke={circleStroke}
                    strokeWidth={isTarget ? 2.5 : 2}
                    className="shadow-sm transition-all"
                  />

                  {/* Clean Vector SVG Icon by Role */}
                  {isTarget ? (
                    // Target Crosshairs / Star Emblem
                    <g transform="translate(-8, -8)">
                      <path
                        d="M8 1 L10 5.5 L15 6 L11.5 9.5 L12.5 14.5 L8 12 L3.5 14.5 L4.5 9.5 L1 6 L6 5.5 Z"
                        fill="#d97706"
                        stroke="#b45309"
                        strokeWidth="0.5"
                      />
                    </g>
                  ) : isUpstream ? (
                    // Inflow Arrow Path
                    <g transform="translate(-7, -7)">
                      <path
                        d="M3 3 L11 11 M11 5 L11 11 L5 11"
                        stroke="#059669"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </g>
                  ) : (
                    // Bank Pillar Vector Path
                    <g transform="translate(-7, -7)">
                      <path
                        d="M1 4 L7 1 L13 4 M2 4 L2 12 M5 4 L5 12 M9 4 L9 12 M12 4 L12 12 M1 12 L13 12"
                        stroke="#2563eb"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </g>
                  )}

                  {/* Account Badge below node */}
                  <rect
                    x={isTarget ? -58 : -50}
                    y={isTarget ? 28 : 24}
                    width={isTarget ? 116 : 100}
                    height={18}
                    rx={5}
                    fill={badgeFill}
                    stroke={isHovered ? '#60a5fa' : '#334155'}
                    strokeWidth={1}
                    className="shadow-xs"
                  />
                  <text
                    x={0}
                    y={isTarget ? 40 : 36}
                    textAnchor="middle"
                    className="text-[9px] font-mono font-bold fill-white"
                  >
                    {badgeText}
                  </text>

                </g>
              );
            })}

            {/* Classic Forensic Dossier Popup Card - Rendered last to ensure highest z-index above all nodes & edges */}
            {hoveredNode && positions[hoveredNode] && (() => {
              const account = hoveredNode;
              const pos = positions[account];
              const stats = nodeStats[account] || {
                inAmt: 0,
                outAmt: 0,
                inCount: 0,
                outCount: 0,
                timespanStr: 'Single Event',
                rangeStr: 'Timestamp not recorded',
                startDateStr: '—',
                endDateStr: '—',
              };
              const isTarget = account === victimAccount;
              const isUpstream = pos.col < 0;
              const bankCode = getBankCode(account);
              const showBelow = pos.y < 185;
              const popupWidth = 320;
              const popupHeight = 158;
              const xPos = -popupWidth / 2;
              const yPos = showBelow ? 36 : -popupHeight - 14;

              return (
                <g
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="pointer-events-none select-none"
                >
                  <foreignObject
                    x={xPos}
                    y={yPos}
                    width={popupWidth}
                    height={popupHeight + 16}
                    className="overflow-visible"
                  >
                    <div className="relative w-[320px] bg-slate-950/95 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-[0_20px_40px_rgba(0,0,0,0.65)] p-4 text-white flex flex-col justify-between ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-100">
                      {/* Triangle Pointer Notch */}
                      {showBelow ? (
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-l border-t border-slate-700 rotate-45" />
                      ) : (
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-r border-b border-slate-700 rotate-45" />
                      )}

                      {/* Header: Bank Code + Account ID + Role Badge */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[10px] font-bold border border-slate-700 shrink-0">
                            {bankCode}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-100 truncate tracking-tight">
                            {account}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                            isTarget
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : isUpstream
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {isTarget ? '★ Target Focus' : isUpstream ? 'Funds Source' : `Hop ${Math.max(1, pos.col)} Flow`}
                        </span>
                      </div>

                      {/* Inflow vs Outflow Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2 my-2.5">
                        <div className="bg-slate-900/90 rounded-xl p-2.5 border border-emerald-500/25 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400 mb-1">
                            <span className="flex items-center gap-1">
                              <ArrowDownLeft size={12} />
                              <span>INFLOW</span>
                            </span>
                            <span className="text-slate-400 font-mono font-medium">{stats.inCount} tx</span>
                          </div>
                          <div className="font-mono text-[13px] font-bold text-emerald-300 truncate">
                            ₹{stats.inAmt.toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div className="bg-slate-900/90 rounded-xl p-2.5 border border-blue-500/25 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[10px] font-bold text-blue-400 mb-1">
                            <span className="flex items-center gap-1">
                              <ArrowUpRight size={12} />
                              <span>OUTFLOW</span>
                            </span>
                            <span className="text-slate-400 font-mono font-medium">{stats.outCount} tx</span>
                          </div>
                          <div className="font-mono text-[13px] font-bold text-blue-300 truncate">
                            ₹{stats.outAmt.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      {/* Classic Timespan Banner */}
                      <div className="bg-slate-900/90 rounded-xl px-3 py-2 border border-slate-800 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                            <Clock size={12} className="text-amber-400 shrink-0" />
                            <span>Active Timespan</span>
                          </span>
                          <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20 shadow-2xs">
                            {stats.timespanStr}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate tracking-tight">
                          {stats.rangeStr}
                        </div>
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            })()}
          </svg>
        )}
      </div>

      {/* Legend & Forensic Attribution Info */}
      <div className="px-5 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-700 font-semibold">Funds Source (Inflow)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-700 font-semibold">Investigated ID (★ Focus)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-700 font-semibold">Transferred Accounts (Outflow)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-600 border-dashed" />
            <span className="text-slate-700 font-semibold">Detected Cycle</span>
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Full 360° Flow Graph (Sources → Target Account → Transferred Hops)
        </span>
      </div>
    </div>
  );
};
