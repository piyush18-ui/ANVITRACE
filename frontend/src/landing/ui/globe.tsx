import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';

export interface GlobeMarker {
  lat: number;
  lng: number;
  label?: string;
  sublabel?: string;
  color?: string;
  size?: number;
  risk?: number;
  volume?: string;
  layer?: string;
}

export interface GlobeArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color?: string;
  label?: string;
  amount?: string;
  status?: string;
}

export interface GlobeProps {
  width?: number | string;
  height?: number | string;
  primaryColor?: string;
  neutralColor?: string;
  atmosphereColor?: string;
  showAtmosphere?: boolean;
  autoRotateSpeed?: number;
  enableZoom?: boolean;
  interactive?: boolean;
  arcCount?: number;
  arcInterval?: number;
  arcAnimationDuration?: number;
  cameraAltitude?: number;
  pointSize?: number;
  pointResolution?: number;
  atmosphereAltitude?: number;
  globeOpacity?: number;
  landDotRows?: number;
  landMapUrl?: string;
  className?: string;
  onReady?: () => void;
  onGlobeClick?: (coords: { lat: number; lng: number }) => void;
  markers?: GlobeMarker[];
  arcs?: GlobeArc[];
}

// ─── Realistic continent polygons ────────────────────────────────────
// Each polygon is [lat, lng][] forming a closed shape. We use simplified
// but recognisable outlines for every major landmass. The winding order
// doesn't matter – we use a ray-cast (even-odd) point-in-polygon test.

type Poly = number[][]; // [lat, lng][]

const NORTH_AMERICA: Poly = [
  [83,-70],[83,-60],[72,-55],[66,-62],[60,-64],[52,-55],[47,-53],[44,-59],
  [43,-65],[41,-70],[30,-80],[25,-80],[25,-82],[29,-85],[30,-88],[29,-90],
  [26,-97],[28,-97],[33,-106],[32,-114],[31,-117],[33,-120],[38,-123],
  [42,-124],[46,-124],[49,-123],[50,-127],[54,-130],[58,-136],[59,-140],
  [60,-148],[61,-150],[64,-153],[66,-164],[68,-164],[70,-162],[71,-156],
  [71,-152],[69,-141],[68,-136],[66,-128],[65,-120],[66,-110],[68,-108],
  [72,-95],[74,-90],[76,-86],[80,-80],[83,-70],
];

const CENTRAL_AMERICA: Poly = [
  [30,-88],[29,-90],[26,-97],[22,-97],[18,-95],[16,-88],[14,-87],[12,-84],
  [9,-79],[8,-77],[9,-76],[7,-76],[8,-82],[10,-84],[12,-87],[15,-90],
  [18,-96],[20,-97],[25,-90],[26,-88],[28,-88],[30,-88],
];

const SOUTH_AMERICA: Poly = [
  [12,-70],[11,-72],[10,-75],[7,-77],[4,-77],[1,-78],[-2,-80],[-4,-81],
  [-6,-81],[-8,-79],[-14,-76],[-18,-70],[-23,-70],[-33,-71],[-40,-65],
  [-43,-65],[-46,-67],[-50,-69],[-52,-70],[-54,-69],[-55,-66],[-53,-64],
  [-48,-65],[-42,-63],[-38,-57],[-33,-52],[-28,-49],[-23,-42],[-18,-39],
  [-13,-38],[-8,-35],[-5,-35],[-2,-50],[2,-52],[5,-60],[8,-62],[10,-67],
  [12,-72],[12,-70],
];

const EUROPE: Poly = [
  [71,28],[70,32],[68,30],[64,30],[60,29],[59,24],[56,21],[54,14],
  [55,8],[54,9],[53,7],[51,4],[49,0],[47,-2],[43,-9],[36,-6],[36,-5],
  [37,0],[38,0],[40,-1],[41,0],[42,3],[43,5],[44,8],[45,14],[44,15],
  [42,16],[40,20],[38,24],[36,23],[36,28],[37,28],[39,26],[41,29],
  [44,29],[45,30],[47,36],[50,40],[55,38],[57,40],[60,32],[62,31],
  [65,30],[69,32],[70,30],[71,28],
];

const SCANDINAVIA: Poly = [
  [56,8],[56,12],[58,8],[59,5],[60,5],[61,5],[63,7],[65,14],[67,14],
  [68,16],[69,18],[70,20],[71,26],[71,28],[70,30],[69,32],[68,30],
  [65,30],[62,31],[60,29],[59,24],[56,21],[55,13],[56,8],
];

const BRITISH_ISLES: Poly = [
  [50,-6],[51,-5],[52,-4],[53,-3],[54,-3],[55,-4],[56,-5],[57,-6],
  [58,-5],[58,-3],[57,-2],[55,-1],[53,0],[52,1],[51,1],[50,0],[50,-4],
  [50,-6],
];

const AFRICA: Poly = [
  [37,-1],[36,-5],[36,-6],[34,-8],[31,-10],[28,-13],[25,-15],[21,-17],
  [18,-16],[15,-17],[13,-16],[10,-14],[6,-10],[5,-7],[5,-4],[4,-3],
  [4,1],[3,10],[1,10],[0,9],[-2,12],[-4,12],[-6,12],[-10,14],[-12,14],
  [-15,12],[-17,12],[-22,14],[-25,15],[-28,16],[-30,18],[-32,18],
  [-33,22],[-34,24],[-34,26],[-33,28],[-30,31],[-27,33],[-25,35],
  [-20,36],[-16,37],[-12,40],[-10,40],[-6,42],[-3,42],[-1,42],[2,42],
  [4,42],[5,44],[8,44],[10,44],[10,48],[12,50],[15,50],[18,50],[20,48],
  [23,44],[25,42],[27,40],[30,36],[32,33],[33,36],[35,36],[37,11],
  [37,1],[37,-1],
];

const MADAGASCAR: Poly = [
  [-12,49],[-14,48],[-18,44],[-22,44],[-24,44],[-26,47],[-24,48],
  [-20,50],[-16,50],[-12,49],
];

const MIDDLE_EAST: Poly = [
  [37,36],[37,42],[37,44],[35,44],[32,47],[30,48],[27,50],[24,51],
  [22,51],[20,53],[18,53],[15,43],[13,43],[12,44],[12,50],[14,48],
  [15,52],[17,55],[22,60],[25,62],[28,62],[30,52],[32,48],[35,46],
  [37,44],[37,42],[37,36],
];

const INDIA: Poly = [
  [35,74],[34,77],[32,77],[28,88],[27,92],[25,92],[22,92],[21,90],
  [22,87],[18,84],[15,80],[12,80],[10,79],[8,77],[8,76],[10,76],
  [12,75],[15,74],[17,73],[19,72],[20,72],[21,70],[23,69],[24,68],
  [25,67],[27,63],[30,66],[33,72],[35,74],
];

const SRI_LANKA: Poly = [
  [10,80],[8,82],[6,81],[6,80],[8,79],[10,80],
];

const SOUTHEAST_ASIA: Poly = [
  [28,97],[22,100],[21,106],[18,106],[16,108],[12,109],[10,105],
  [8,103],[5,103],[2,103],[1,104],[1,105],[3,106],[5,107],[7,107],
  [8,106],[10,106],[12,109],[14,109],[18,107],[21,106],[22,100],
  [24,98],[28,97],
];

const CHINA_EAST_ASIA: Poly = [
  [53,120],[50,130],[48,135],[46,137],[44,132],[42,130],[39,122],
  [35,119],[31,121],[28,121],[25,119],[22,114],[22,109],[21,106],
  [22,100],[24,98],[28,97],[30,94],[32,92],[28,88],[27,92],[25,92],
  [22,92],[20,97],[23,101],[25,102],[28,104],[30,104],[33,107],
  [35,110],[38,114],[40,117],[42,120],[45,125],[48,130],[50,130],
  [53,120],
];

const KOREA: Poly = [
  [43,124],[42,130],[38,127],[35,126],[34,128],[36,130],[38,129],
  [40,129],[43,131],[43,124],
];

const JAPAN: Poly = [
  [45,142],[44,144],[42,141],[40,140],[38,140],[36,140],[34,136],
  [33,132],[34,131],[35,133],[36,136],[38,139],[40,140],[42,141],
  [43,145],[45,142],
];

const INDONESIA: Poly = [
  [6,95],[5,98],[2,104],[0,104],[-1,105],[-2,106],[-3,106],[-5,106],
  [-7,106],[-7,108],[-7,110],[-8,112],[-8,115],[-8,116],[-6,116],
  [-5,110],[-3,108],[-1,107],[1,105],[3,105],[5,104],[6,98],[6,95],
];

const BORNEO: Poly = [
  [7,117],[6,118],[4,118],[2,114],[1,110],[0,109],[1,109],[2,111],
  [4,115],[6,118],[7,117],
];

const PAPUA_NEW_GUINEA: Poly = [
  [-2,141],[-4,145],[-6,148],[-8,148],[-10,150],[-10,147],[-8,144],
  [-6,141],[-4,141],[-2,141],
];

const AUSTRALIA: Poly = [
  [-11,131],[-12,136],[-14,136],[-17,140],[-19,146],[-22,150],
  [-27,153],[-29,153],[-33,152],[-35,150],[-37,150],[-38,147],
  [-39,146],[-38,144],[-36,137],[-35,137],[-35,134],[-33,132],
  [-32,128],[-32,124],[-31,115],[-28,114],[-25,113],[-22,114],
  [-20,119],[-18,122],[-15,129],[-14,130],[-12,131],[-11,131],
];

const NEW_ZEALAND: Poly = [
  [-34,173],[-37,175],[-39,177],[-42,174],[-46,170],[-47,167],
  [-45,167],[-43,172],[-41,175],[-38,178],[-36,175],[-34,173],
];

const RUSSIA_SIBERIA: Poly = [
  [71,28],[73,40],[72,50],[68,50],[66,60],[68,70],[71,80],[73,90],
  [72,100],[70,110],[72,120],[72,130],[68,140],[66,150],[65,160],
  [65,170],[66,180],[65,170],[62,160],[60,155],[58,150],[56,138],
  [53,135],[53,120],[50,130],[48,135],[46,137],[44,132],[43,131],
  [43,124],[42,120],[40,117],[38,114],[35,110],[33,107],[30,104],
  [28,104],[25,102],[23,101],[20,97],[22,92],[25,92],[27,92],[28,88],
  [30,85],[33,80],[35,74],[36,70],[38,62],[38,56],[40,50],[42,44],
  [42,40],[44,40],[47,36],[50,40],[55,38],[57,40],[60,32],[62,31],
  [65,30],[68,30],[70,30],[71,28],
];

const GREENLAND: Poly = [
  [83,-20],[82,-14],[80,-12],[77,-18],[76,-22],[73,-24],[72,-28],
  [70,-28],[68,-30],[66,-36],[64,-40],[62,-44],[60,-48],[60,-50],
  [64,-52],[68,-54],[72,-56],[76,-60],[78,-66],[80,-68],[81,-60],
  [82,-46],[83,-34],[83,-20],
];

const ALL_POLYS: Poly[] = [
  NORTH_AMERICA, CENTRAL_AMERICA, SOUTH_AMERICA, EUROPE, SCANDINAVIA,
  BRITISH_ISLES, AFRICA, MADAGASCAR, MIDDLE_EAST, INDIA, SRI_LANKA,
  SOUTHEAST_ASIA, CHINA_EAST_ASIA, KOREA, JAPAN, INDONESIA, BORNEO,
  PAPUA_NEW_GUINEA, AUSTRALIA, NEW_ZEALAND, RUSSIA_SIBERIA, GREENLAND,
];

// Water bodies to carve out (lakes, seas inside the land polygons)
const WATER_BODIES: Poly[] = [
  // Caspian Sea
  [[47,50],[46,53],[44,53],[41,50],[37,49],[37,51],[39,53],[42,54],[45,54],[47,52],[47,50]],
  // Great Lakes (simplified)
  [[48,-88],[47,-85],[44,-82],[42,-81],[42,-83],[44,-87],[46,-90],[48,-88]],
  // Hudson Bay
  [[63,-95],[63,-82],[60,-78],[56,-80],[55,-83],[52,-82],[52,-84],[55,-88],[58,-94],[63,-95]],
  // Mediterranean (simplified)
  [[46,6],[44,8],[42,5],[38,2],[36,0],[36,12],[38,18],[40,20],[37,22],[35,25],[36,28],[37,36],[40,30],[42,30],[44,28],[44,15],[45,14],[46,13],[46,6]],
  // Black Sea
  [[47,28],[46,30],[44,30],[42,28],[41,29],[42,32],[44,34],[46,37],[48,40],[47,38],[46,34],[46,30],[47,28]],
  // Red Sea
  [[30,33],[28,34],[22,36],[16,42],[13,43],[14,43],[18,40],[22,38],[26,36],[30,34],[30,33]],
  // Persian Gulf
  [[30,48],[27,50],[24,52],[25,56],[28,56],[30,52],[30,48]],
];

// Ray-cast (even-odd) point-in-polygon test
function pointInPoly(lat: number, lng: number, poly: Poly): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i][0], xi = poly[i][1];
    const yj = poly[j][0], xj = poly[j][1];
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function isLandCoord(lat: number, lng: number): boolean {
  // Check land polygons
  let onLand = false;
  for (let i = 0; i < ALL_POLYS.length; i++) {
    if (pointInPoly(lat, lng, ALL_POLYS[i])) {
      onLand = true;
      break;
    }
  }
  if (!onLand) return false;
  // Carve water bodies
  for (let i = 0; i < WATER_BODIES.length; i++) {
    if (pointInPoly(lat, lng, WATER_BODIES[i])) {
      return false;
    }
  }
  return true;
}

// ─── Vector math ─────────────────────────────────────────────────────
function latLngToUnitVector(lat: number, lng: number): [number, number, number] {
  const phi = (lat * Math.PI) / 180;
  const theta = (lng * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  return [cosPhi * Math.sin(theta), Math.sin(phi), cosPhi * Math.cos(theta)];
}

function slerp(
  v0: [number, number, number],
  v1: [number, number, number],
  t: number
): [number, number, number] {
  let dot = v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2];
  dot = Math.max(-1, Math.min(1, dot));
  const theta = Math.acos(dot);
  if (Math.abs(theta) < 0.0001) return v0;
  const sinTheta = Math.sin(theta);
  const a = Math.sin((1 - t) * theta) / sinTheta;
  const b = Math.sin(t * theta) / sinTheta;
  return [a * v0[0] + b * v1[0], a * v0[1] + b * v1[1], a * v0[2] + b * v1[2]];
}

// ─── Globe Component ─────────────────────────────────────────────────
export const Globe: React.FC<GlobeProps> = ({
  width = 'auto',
  height = 'auto',
  primaryColor = '#f59e0b',
  neutralColor = '#71717a',
  showAtmosphere = true,
  autoRotateSpeed = 0.85,
  interactive = true,
  arcCount = 10,
  arcInterval = 4000,
  arcAnimationDuration = 2200,
  cameraAltitude = 2,
  pointSize = 0.28,
  atmosphereAltitude = 0.3,
  globeOpacity = 1,
  landDotRows = 160,
  className = '',
  onReady,
  onGlobeClick,
  markers: propMarkers,
  arcs: propArcs,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef({ yaw: 1.1, pitch: 0.22, velocityYaw: 0, velocityPitch: 0 });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0, time: 0 });
  const [hoveredMarker, setHoveredMarker] = useState<GlobeMarker | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Default markers
  const defaultMarkers: GlobeMarker[] = useMemo(() => [
    { lat: 19.076, lng: 72.878, label: 'Mumbai', sublabel: 'Victim Origin • ₹12.48L', color: '#ef4444', size: 5.5, risk: 94, volume: '₹12,48,320', layer: 'Victim' },
    { lat: 28.614, lng: 77.209, label: 'New Delhi', sublabel: 'L1 Mule • Rapid Splitting', color: '#f59e0b', size: 5, risk: 88, volume: '₹6,40,000', layer: 'Layer 1' },
    { lat: 12.972, lng: 77.595, label: 'Bengaluru', sublabel: 'L2 Hub • ATM/UPI Fan-out', color: '#f59e0b', size: 4.5, risk: 76, volume: '₹3,85,000', layer: 'Layer 2' },
    { lat: 25.205, lng: 55.271, label: 'Dubai', sublabel: 'Offshore Cashout • Hawala', color: '#ef4444', size: 5.5, risk: 96, volume: '₹4,50,000', layer: 'Layer 3' },
    { lat: 1.352, lng: 103.820, label: 'Singapore', sublabel: 'Fintech Settlement Rail', color: '#10b981', size: 4.5, risk: 42, volume: '₹2,77,450', layer: 'Transit' },
    { lat: 51.507, lng: -0.128, label: 'London', sublabel: 'Swift Intermediary', color: '#71717a', size: 4, risk: 30, volume: 'Monitored', layer: 'Correspondent' },
    { lat: 40.713, lng: -74.006, label: 'New York', sublabel: 'Fedwire Gateway', color: '#71717a', size: 4, risk: 28, volume: 'Monitored', layer: 'Audit' },
    { lat: 22.319, lng: 114.169, label: 'Hong Kong', sublabel: 'Crypto OTC Off-Ramp', color: '#ef4444', size: 5, risk: 92, volume: 'USDT 45K', layer: 'L3 Crypto' },
  ], []);

  const defaultArcs: GlobeArc[] = useMemo(() => [
    { startLat: 19.076, startLng: 72.878, endLat: 28.614, endLng: 77.209, color: '#f59e0b' },
    { startLat: 19.076, startLng: 72.878, endLat: 12.972, endLng: 77.595, color: '#f59e0b' },
    { startLat: 28.614, startLng: 77.209, endLat: 25.205, endLng: 55.271, color: '#ef4444' },
    { startLat: 12.972, startLng: 77.595, endLat: 1.352, endLng: 103.820, color: '#f59e0b' },
    { startLat: 1.352, startLng: 103.820, endLat: 22.319, endLng: 114.169, color: '#ef4444' },
    { startLat: 25.205, startLng: 55.271, endLat: 51.507, endLng: -0.128, color: '#71717a' },
  ], []);

  const activeMarkers = propMarkers || defaultMarkers;
  const activeArcs = propArcs || defaultArcs;

  // Generate land dots using polygon-based coastlines
  const landDots = useMemo(() => {
    const dots: Array<{ v: [number, number, number] }> = [];
    const rows = Math.min(280, Math.max(100, landDotRows));
    const step = 180 / rows;
    for (let lat = -80; lat <= 82; lat += step) {
      const cosLat = Math.cos((lat * Math.PI) / 180);
      const cols = Math.max(10, Math.round((360 / step) * cosLat));
      const lngStep = 360 / cols;
      for (let lng = -180; lng < 180; lng += lngStep) {
        if (isLandCoord(lat, lng)) {
          dots.push({ v: latLngToUnitVector(lat, lng) });
        }
      }
    }
    return dots;
  }, [landDotRows]);

  // ─── Render loop ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    let last = performance.now();
    onReady?.();

    const render = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const R = Math.min(rect.width, rect.height) * 0.42;

      // auto-rotation & inertia
      if (!isDraggingRef.current) {
        rotationRef.current.yaw += autoRotateSpeed * 0.3 * dt;
        rotationRef.current.yaw += rotationRef.current.velocityYaw;
        rotationRef.current.pitch += rotationRef.current.velocityPitch;
        rotationRef.current.velocityYaw *= 0.92;
        rotationRef.current.velocityPitch *= 0.92;
      }
      rotationRef.current.pitch = Math.max(-0.65, Math.min(0.65, rotationRef.current.pitch));

      const { yaw, pitch } = rotationRef.current;
      const cY = Math.cos(yaw), sY = Math.sin(yaw);
      const cP = Math.cos(pitch), sP = Math.sin(pitch);

      const project = (v: [number, number, number], r: number) => {
        const x1 = v[0] * cY + v[2] * sY;
        const y1 = v[1];
        const z1 = -v[0] * sY + v[2] * cY;
        const y2 = y1 * cP - z1 * sP;
        const z2 = y1 * sP + z1 * cP;
        const d = cameraAltitude * 1.5;
        const f = d / (d - (z2 * r) / (R * 1.8));
        return { x: cx + x1 * r * f, y: cy - y2 * r * f, z: z2, vis: z2 > -0.02 };
      };

      // ── atmosphere glow ──
      if (showAtmosphere) {
        const ag = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * (1 + atmosphereAltitude * 0.4));
        ag.addColorStop(0, 'rgba(245,158,11,0.04)');
        ag.addColorStop(0.5, 'rgba(245,158,11,0.07)');
        ag.addColorStop(1, 'rgba(245,158,11,0)');
        ctx.fillStyle = ag;
        ctx.beginPath();
        ctx.arc(cx, cy, R * (1 + atmosphereAltitude * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }

      // ── globe body ──
      const sg = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.05, cx, cy, R);
      sg.addColorStop(0, '#fefefe');
      sg.addColorStop(0.6, '#f1f5f9');
      sg.addColorStop(1, '#cbd5e1');
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = sg;
      ctx.globalAlpha = globeOpacity;
      ctx.shadowColor = 'rgba(15,23,42,0.10)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 10;
      ctx.fill();
      ctx.strokeStyle = 'rgba(203,213,225,0.6)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();

      // ── subtle latitude lines ──
      ctx.save();
      ctx.strokeStyle = 'rgba(226,232,240,0.3)';
      ctx.lineWidth = 0.4;
      for (const latLine of [-45, 0, 23.4, 45]) {
        ctx.beginPath();
        let started = false;
        for (let lng = 0; lng < 360; lng += 4) {
          const p = project(latLngToUnitVector(latLine, lng), R);
          if (p.vis) {
            if (!started) { ctx.moveTo(p.x, p.y); started = true; }
            else ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
      }
      ctx.restore();

      // ── land dots ──
      const dotR = Math.max(0.8, R * (pointSize / 80));
      for (const dot of landDots) {
        const p = project(dot.v, R);
        if (!p.vis) continue;
        const depth = Math.max(0.05, p.z);
        const alpha = Math.min(1, depth * 1.4);
        // Use a warm earthy tone for land
        ctx.fillStyle = `rgba(120,113,108,${alpha * 0.72})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR * (0.7 + depth * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      // ── arcs ──
      const nArcs = Math.min(activeArcs.length, arcCount);
      for (let i = 0; i < nArcs; i++) {
        const arc = activeArcs[i];
        const vS = latLngToUnitVector(arc.startLat, arc.startLng);
        const vE = latLngToUnitVector(arc.endLat, arc.endLng);
        const off = i * (arcInterval / nArcs);
        const t = ((now + off) % arcInterval) / arcAnimationDuration;
        const progress = Math.min(1, t);
        const segs = 36;
        const pts: Array<{ x: number; y: number; z: number; vis: boolean; t: number }> = [];
        for (let s = 0; s <= segs; s++) {
          const st = s / segs;
          const vm = slerp(vS, vE, st);
          const alt = Math.sin(st * Math.PI) * R * 0.2;
          const p = project(vm, R + alt);
          pts.push({ ...p, t: st });
        }
        // dashed base
        ctx.save();
        ctx.beginPath();
        let started = false;
        for (const pt of pts) {
          if (pt.vis) { if (!started) { ctx.moveTo(pt.x, pt.y); started = true; } else ctx.lineTo(pt.x, pt.y); }
        }
        ctx.strokeStyle = arc.color || primaryColor;
        ctx.globalAlpha = 0.18;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.restore();

        // pulse
        if (progress > 0 && progress < 1) {
          const head = progress;
          const tail = Math.max(0, head - 0.25);
          ctx.save();
          ctx.beginPath();
          let ps = false;
          for (const pt of pts) {
            if (pt.t >= tail && pt.t <= head && pt.vis) {
              if (!ps) { ctx.moveTo(pt.x, pt.y); ps = true; } else ctx.lineTo(pt.x, pt.y);
            }
          }
          ctx.strokeStyle = arc.color || primaryColor;
          ctx.globalAlpha = 0.9;
          ctx.lineWidth = 2.2;
          ctx.setLineDash([]);
          ctx.shadowColor = arc.color || primaryColor;
          ctx.shadowBlur = 6;
          ctx.stroke();
          const hi = Math.min(pts.length - 1, Math.floor(head * segs));
          if (pts[hi]?.vis) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(pts[hi].x, pts[hi].y, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // ── markers ──
      const pulse = (now % 2200) / 2200;
      for (const m of activeMarkers) {
        const p = project(latLngToUnitVector(m.lat, m.lng), R + 1);
        if (!p.vis) continue;
        const c = m.color || primaryColor;
        const sz = m.size || 4.5;
        ctx.save();
        // pulse ring
        const wr = sz + pulse * 14;
        ctx.strokeStyle = c;
        ctx.globalAlpha = Math.max(0, 1 - pulse) * 0.6;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, wr, 0, Math.PI * 2);
        ctx.stroke();
        // core
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c;
        ctx.shadowColor = c;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fill();
        // label
        if (m.risk && m.risk >= 75) {
          ctx.shadowBlur = 0;
          const lbl = m.label || 'Node';
          ctx.font = '600 9px ui-monospace,monospace';
          const tw = ctx.measureText(lbl).width + 10;
          const bx = p.x + 9, by = p.y - 9;
          ctx.fillStyle = 'rgba(24,24,27,0.9)';
          ctx.beginPath();
          ctx.roundRect(bx, by, tw, 16, 3);
          ctx.fill();
          ctx.strokeStyle = 'rgba(245,158,11,0.35)';
          ctx.lineWidth = 0.7;
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.fillText(lbl, bx + 5, by + 11);
        }
        ctx.restore();
      }

      ctx.restore();
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [activeArcs, activeMarkers, arcAnimationDuration, arcCount, arcInterval, atmosphereAltitude, autoRotateSpeed, cameraAltitude, globeOpacity, landDots, neutralColor, onReady, pointSize, primaryColor, showAtmosphere]);

  // ─── Pointer handlers ──────────────────────────────────────────────
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    lastPointerRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      const now = performance.now();
      const dt = Math.max(1, now - lastPointerRef.current.time);
      rotationRef.current.yaw += dx * 0.006;
      rotationRef.current.pitch += dy * 0.006;
      rotationRef.current.velocityYaw = (dx / dt) * 0.003;
      rotationRef.current.velocityPitch = (dy / dt) * 0.003;
      lastPointerRef.current = { x: e.clientX, y: e.clientY, time: now };
    }
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div
      className={`relative flex items-center justify-center select-none overflow-hidden ${className}`}
      style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block touch-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
    </div>
  );
};

export default Globe;
