import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { MoneyTrailEdge, GraphNode } from '../api';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Download,
  Grid,
  RotateCcw,
  Crosshair,
  Loader2,
} from 'lucide-react';

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
  // Pan and Zoom interactive state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 30, y: 20 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const [minAmountFilter, setMinAmountFilter] = useState<number>(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [flowFilter, setFlowFilter] = useState<'all' | 'inflow' | 'outflow'>('all');

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const startPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);

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
    const computedHeight = Math.max(520, (maxInCol + 1) * nodeSpacing);

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

    const computedWidth = Math.max(1180, 240 + (maxC - minC + 1) * colWidth);

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

  // Mouse wheel zoom handler (non-passive to prevent page scroll)
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((prev) => Math.min(2.5, Math.max(0.35, Number((prev * factor).toFixed(2)))));
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Escape key listener for fallback overlay fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => setIsFullscreen(false));
        } else {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, select, input, .no-pan')) return;
    setIsPanning(true);
    hasMovedRef.current = false;
    startPanRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = Math.abs(e.clientX - (startPanRef.current.x + pan.x));
    const dy = Math.abs(e.clientY - (startPanRef.current.y + pan.y));
    if (dx > 3 || dy > 3) {
      hasMovedRef.current = true;
    }
    setPan({
      x: e.clientX - startPanRef.current.x,
      y: e.clientY - startPanRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Reset view to 100% and default offset
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 30, y: 20 });
  }, []);

  // Center focus directly on the investigated Target Account
  const centerOnTarget = useCallback(() => {
    const targetPos = positions[victimAccount];
    const container = canvasContainerRef.current;
    if (targetPos && container) {
      const { clientWidth, clientHeight } = container;
      setZoom(1);
      setPan({
        x: Math.round(clientWidth / 2 - targetPos.x),
        y: Math.round(clientHeight / 2 - targetPos.y),
      });
    } else {
      resetView();
    }
  }, [positions, victimAccount, resetView]);

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!containerRef.current) return;
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          setIsFullscreen(false);
        }
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  }, []);

  // Download high-resolution PNG image
  const handleDownloadImage = useCallback(() => {
    if (!svgRef.current) return;
    setIsExporting(true);

    try {
      const svgEl = svgRef.current;
      const cloned = svgEl.cloneNode(true) as SVGSVGElement;

      // Remove interactive foreignObject popup card from export
      const foreignObjects = cloned.querySelectorAll('foreignObject');
      foreignObjects.forEach((fo) => fo.remove());

      // Reset transform on root group so the whole graph renders cleanly
      const rootG = cloned.querySelector('#graph-root-group');
      if (rootG) {
        rootG.setAttribute('transform', 'translate(60, 40) scale(1)');
      }

      const exportW = Math.max(canvasWidth + 120, 1240);
      const exportH = Math.max(dynamicHeight + 100, 640);
      cloned.setAttribute('width', String(exportW));
      cloned.setAttribute('height', String(exportH));
      cloned.setAttribute('viewBox', `0 0 ${exportW} ${exportH}`);

      // Base background rectangle for image viewer compatibility
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', '0');
      bg.setAttribute('y', '0');
      bg.setAttribute('width', String(exportW));
      bg.setAttribute('height', String(exportH));
      bg.setAttribute('fill', '#f8fafc');
      cloned.insertBefore(bg, cloned.firstChild);

      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(cloned);
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const scale = 2; // 2x DPI crisp rendering
        const bannerH = 56;
        const canvas = document.createElement('canvas');
        canvas.width = exportW * scale;
        canvas.height = (exportH + bannerH) * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(scale, scale);

          // Official dark forensic header banner
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, exportW, bannerH);

          // Blue forensic accent strip
          ctx.fillStyle = '#2563eb';
          ctx.fillRect(0, bannerH - 3, exportW, 3);

          // Header Title
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillText('ANVITRACE FORENSIC FINANCIAL INTELLIGENCE — 360° TRANSACTION LINEAGE GRAPH', 24, 25);

          // Header Metadata
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px "Courier New", monospace';
          const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
          ctx.fillText(
            `TARGET: ${victimAccount} | TOTAL EDGES: ${filteredEdges.length} | DEPTH: HOP ${selectedHop} | GENERATED: ${nowStr} UTC`,
            24,
            43
          );

          // Draw Graph SVG below banner
          ctx.drawImage(img, 0, bannerH, exportW, exportH);

          canvas.toBlob((blob) => {
            if (blob) {
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `ANVITRACE_FLOW_GRAPH_${victimAccount}_${Date.now()}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(link.href);
            }
            URL.revokeObjectURL(url);
            setIsExporting(false);
          }, 'image/png');
        } else {
          URL.revokeObjectURL(url);
          setIsExporting(false);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setIsExporting(false);
      };
      img.src = url;
    } catch {
      setIsExporting(false);
    }
  }, [canvasWidth, dynamicHeight, filteredEdges.length, selectedHop, victimAccount]);

  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-none bg-slate-950 text-white'
          : 'relative'
      }`}
    >
      {/* Top Graph Controls Bar */}
      <div
        className={`px-5 py-3 border-b flex items-center justify-between flex-wrap gap-3 select-none ${
          isFullscreen ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
          </span>
          <span
            className={`font-bold text-xs tracking-tight ${
              isFullscreen ? 'text-white' : 'text-slate-900'
            }`}
          >
            360° Money-Flow &amp; Lineage Graph
          </span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-medium ${
              isFullscreen ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-100'
            }`}
          >
            {filteredEdges.length} active edges • {Object.keys(positions).length} accounts
          </span>
        </div>

        {/* View Mode Filters */}
        <div
          className={`flex items-center gap-1.5 p-0.5 rounded-lg border text-xs font-semibold ${
            isFullscreen ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100/80 border-slate-200/60'
          }`}
        >
          <button
            type="button"
            onClick={() => setFlowFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              flowFilter === 'all'
                ? isFullscreen
                  ? 'bg-slate-700 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-900 shadow-xs font-bold'
                : isFullscreen
                ? 'text-slate-300 hover:text-white'
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
                : 'text-emerald-500 hover:bg-emerald-500/10'
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
                : 'text-blue-500 hover:bg-blue-500/10'
            }`}
          >
            <ArrowUpRight size={13} />
            <span>Transfers ({counts.outflow})</span>
          </button>
        </div>

        {/* Action Controls & Depth Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Depth Selector Tabs: Hop 1 - Hop 4 */}
          <div
            className={`flex items-center gap-1 p-0.5 rounded-lg border text-xs font-semibold ${
              isFullscreen ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="text-[10px] text-slate-400 px-1.5 uppercase font-bold tracking-wider">
              DEPTH:
            </span>
            {[1, 2, 3, 4].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onSelectHop(h)}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  selectedHop === h
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : isFullscreen
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
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
            className={`text-xs rounded-lg px-2.5 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 border ${
              isFullscreen
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="0">All Amounts</option>
            <option value="10000">Filter ≥ ₹10K</option>
            <option value="50000">Filter ≥ ₹50K</option>
            <option value="100000">Filter ≥ ₹1.0L</option>
          </select>

          {/* Grid Pattern Toggle */}
          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
              showGrid
                ? isFullscreen
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-xs'
                  : 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
                : isFullscreen
                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800'
            }`}
            title="Toggle Forensic Grid Pattern"
          >
            <Grid size={13} />
            <span>Grid</span>
          </button>

          {/* Pan & Zoom Controls Toolbar */}
          <div
            className={`flex items-center rounded-lg p-0.5 border ${
              isFullscreen ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.35, Number((z - 0.1).toFixed(2))))}
              className={`p-1 rounded cursor-pointer ${
                isFullscreen ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-200'
              }`}
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span
              className={`text-[10px] font-mono px-1.5 font-bold min-w-[38px] text-center ${
                isFullscreen ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
              className={`p-1 rounded cursor-pointer ${
                isFullscreen ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-200'
              }`}
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <div className={`w-[1px] h-3.5 mx-0.5 ${isFullscreen ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <button
              type="button"
              onClick={resetView}
              className={`p-1 rounded cursor-pointer ${
                isFullscreen ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-200'
              }`}
              title="Reset Zoom &amp; Pan to Center"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              onClick={centerOnTarget}
              className={`p-1 rounded cursor-pointer ${
                isFullscreen ? 'text-amber-400 hover:bg-slate-700' : 'text-amber-600 hover:bg-slate-200'
              }`}
              title="Center on Target Node"
            >
              <Crosshair size={13} />
            </button>
          </div>

          {/* Export PNG Image Button */}
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
            title="Download Full Graph as High-Resolution PNG Image"
          >
            {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>{isExporting ? 'Exporting...' : 'Export PNG'}</span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg border cursor-pointer transition-all ${
              isFullscreen
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Expand to Full Screen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* SVG Canvas Area with Pan, Zoom & Grid Pattern */}
      <div
        ref={canvasContainerRef}
        className={`relative overflow-hidden select-none cursor-grab active:cursor-grabbing transition-colors ${
          isFullscreen
            ? 'flex-1 w-full h-full min-h-[500px] bg-slate-950'
            : 'h-[520px] bg-slate-50/70'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {filteredEdges.length === 0 && Object.keys(positions).length <= 1 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-xs">
              <ShieldAlert size={22} />
            </div>
            <p className="text-xs font-bold text-slate-700">No transaction trail found for this node.</p>
            <span className="text-[11px] text-slate-400">
              Execute a trace or adjust hop / volume threshold above.
            </span>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="w-full h-full block"
            style={{ width: '100%', height: '100%' }}
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

              {/* Tactical Forensic Coordinate Grid Pattern */}
              <pattern
                id="forensic-subgrid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke={isFullscreen ? '#1e293b' : '#e2e8f0'}
                  strokeWidth="0.6"
                  strokeDasharray="2,2"
                />
              </pattern>

              <pattern
                id="forensic-grid"
                width="100"
                height="100"
                patternUnits="userSpaceOnUse"
              >
                <rect width="100" height="100" fill="url(#forensic-subgrid)" />
                <path
                  d="M 100 0 L 0 0 0 100"
                  fill="none"
                  stroke={isFullscreen ? '#334155' : '#cbd5e1'}
                  strokeWidth="0.9"
                />
                {/* Center crosshair */}
                <path
                  d="M 46 50 L 54 50 M 50 46 L 50 54"
                  fill="none"
                  stroke={isFullscreen ? '#475569' : '#94a3b8'}
                  strokeWidth="0.8"
                />
                {/* Vertex radar dots */}
                <circle cx="0" cy="0" r="1.5" fill={isFullscreen ? '#475569' : '#94a3b8'} />
                <circle cx="100" cy="0" r="1.5" fill={isFullscreen ? '#475569' : '#94a3b8'} />
                <circle cx="0" cy="100" r="1.5" fill={isFullscreen ? '#475569' : '#94a3b8'} />
                <circle cx="100" cy="100" r="1.5" fill={isFullscreen ? '#475569' : '#94a3b8'} />
              </pattern>
            </defs>

            {/* Root interactive graph group with Pan and Zoom */}
            <g id="graph-root-group" transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Infinite Grid Pattern Rect */}
              {showGrid && (
                <rect
                  x="-10000"
                  y="-10000"
                  width="20000"
                  height="20000"
                  fill="url(#forensic-grid)"
                  className="pointer-events-none"
                />
              )}

              {/* Column Headers */}
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

                const bgColor = isFullscreen
                  ? isUpstream
                    ? '#064e3b'
                    : isTarget
                    ? '#78350f'
                    : '#1e3a8a'
                  : isUpstream
                  ? '#ecfdf5'
                  : isTarget
                  ? '#fef3c7'
                  : '#eff6ff';

                const borderColor = isFullscreen
                  ? isUpstream
                    ? '#059669'
                    : isTarget
                    ? '#d97706'
                    : '#3b82f6'
                  : isUpstream
                  ? '#a7f3d0'
                  : isTarget
                  ? '#fde68a'
                  : '#bfdbfe';

                const textColor = isFullscreen
                  ? '#ffffff'
                  : isUpstream
                  ? '#065f46'
                  : isTarget
                  ? '#92400e'
                  : '#1e40af';

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

                const isUpstream = edge.direction === 'upstream' || (toPos.col === 0 && fromPos.col < 0);
                const strokeColor = edge.is_cycle ? '#ef4444' : isUpstream ? '#059669' : '#3b82f6';
                const markerId = edge.is_cycle
                  ? 'url(#arrow-cycle)'
                  : isUpstream
                  ? 'url(#arrow-inflow)'
                  : 'url(#arrow-outflow)';

                // Smooth cubic bezier curve between nodes
                const dx = toPos.x - fromPos.x;
                const pathD = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x + dx * 0.45} ${fromPos.y}, ${
                  toPos.x - dx * 0.45
                } ${toPos.y}, ${toPos.x} ${toPos.y}`;

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
                        edge.is_cycle
                          ? 'fill-rose-700'
                          : isUpstream
                          ? 'fill-emerald-700'
                          : 'fill-slate-800'
                      }`}
                    >
                      {isUpstream ? '+' : ''}₹
                      {edge.amount >= 100000
                        ? `${(edge.amount / 100000).toFixed(1)}L`
                        : `${Math.round(edge.amount / 1000)}k`}
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

                // Ring and fill styling
                let circleFill = isFullscreen ? '#0f172a' : '#ffffff';
                let circleStroke = '#3b82f6';
                let badgeFill = '#0f172a';
                let badgeText = `${bankCode}:${account.slice(-5)}`;

                if (isTarget) {
                  circleFill = isFullscreen ? '#451a03' : '#fef3c7';
                  circleStroke = '#d97706';
                  badgeFill = '#78350f';
                  badgeText = `★ TARGET: ${account.slice(0, 10)}`;
                } else if (isUpstream) {
                  circleFill = isHovered
                    ? isFullscreen
                      ? '#064e3b'
                      : '#d1fae5'
                    : isFullscreen
                    ? '#022c22'
                    : '#ecfdf5';
                  circleStroke = '#059669';
                  badgeFill = '#065f46';
                  badgeText = `SRC: ${bankCode}:${account.slice(-5)}`;
                } else if (isHovered) {
                  circleFill = isFullscreen ? '#1e3a8a' : '#dbeafe';
                  circleStroke = '#1d4ed8';
                }

                return (
                  <g
                    key={account}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    className="cursor-pointer group"
                    onClick={() => {
                      if (hasMovedRef.current) return;
                      if (onSelectAccount) onSelectAccount(account);
                    }}
                    onMouseEnter={() => setHoveredNode(account)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Outer glow ring when hovered */}
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

                    {/* Vector Emblem by Role */}
                    {isTarget ? (
                      <g transform="translate(-8, -8)">
                        <path
                          d="M8 1 L10 5.5 L15 6 L11.5 9.5 L12.5 14.5 L8 12 L3.5 14.5 L4.5 9.5 L1 6 L6 5.5 Z"
                          fill="#d97706"
                          stroke="#b45309"
                          strokeWidth="0.5"
                        />
                      </g>
                    ) : isUpstream ? (
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
                      <g transform="translate(-7, -7)">
                        <path
                          d="M1 4 L7 1 L13 4 M2 4 L2 12 M5 4 L5 12 M9 4 L9 12 M12 4 L12 12 M1 12 L13 12"
                          stroke={isFullscreen ? '#60a5fa' : '#2563eb'}
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

              {/* Classic Forensic Dossier Popup Card */}
              {hoveredNode &&
                positions[hoveredNode] &&
                (() => {
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
                              {isTarget
                                ? '★ Target Focus'
                                : isUpstream
                                ? 'Funds Source'
                                : `Hop ${Math.max(1, pos.col)} Flow`}
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
                                <span className="text-slate-400 font-mono font-medium">
                                  {stats.inCount} tx
                                </span>
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
                                <span className="text-slate-400 font-mono font-medium">
                                  {stats.outCount} tx
                                </span>
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
            </g>
          </svg>
        )}

        {/* Floating Mini HUD Toolbar in Bottom-Left */}
        <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium pointer-events-none select-none z-10">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Interactive Canvas</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>Scroll to Zoom</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>Drag to Pan</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>Hover for Timespan</span>
        </div>

        {/* Floating Fullscreen Exit Button in Top-Right */}
        {isFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl text-xs font-semibold cursor-pointer transition-all backdrop-blur-md"
          >
            <Minimize2 size={13} />
            <span>Exit Fullscreen</span>
            <kbd className="text-[10px] bg-slate-800 px-1 py-0.5 rounded border border-slate-700 font-mono text-slate-400">
              Esc
            </kbd>
          </button>
        )}
      </div>

      {/* Legend & Forensic Attribution Info */}
      <div
        className={`px-5 py-2.5 border-t flex items-center justify-between text-xs font-medium flex-wrap gap-3 ${
          isFullscreen ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-100 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className={isFullscreen ? 'text-slate-200 font-semibold' : 'text-slate-700 font-semibold'}>
              Funds Source (Inflow)
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className={isFullscreen ? 'text-slate-200 font-semibold' : 'text-slate-700 font-semibold'}>
              Investigated ID (★ Focus)
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className={isFullscreen ? 'text-slate-200 font-semibold' : 'text-slate-700 font-semibold'}>
              Transferred Accounts (Outflow)
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-600 border-dashed" />
            <span className={isFullscreen ? 'text-slate-200 font-semibold' : 'text-slate-700 font-semibold'}>
              Detected Cycle
            </span>
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Full 360° Flow Graph (Sources → Target Account → Transferred Hops)
        </span>
      </div>
    </div>
  );
};
