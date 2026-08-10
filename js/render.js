import { osculatingCenter } from "./geometry.js";

// Monochrome palette only — different shades of gray/black carry meaning
// instead of hue.
export const INK = {
  bg: "#000000",
  curve: "#f5f5f5",
  curveTraveled: "#ffffff",
  curveRest: "#4a4a4a",
  grid: "#161616",
  axis: "#2d2d2d",
  tangent: "#ffffff",
  normal: "#9a9a9a",
  osculating: "#707070",
  evolute: "#3a3a3a",
  comb: "#828282",
  point: "#ffffff",
  graphLine: "#ffffff",
  graphZero: "#2d2d2d",
  graphMarker: "#ffffff",
};

export function fitCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

// Builds a math-space -> canvas-space transform that fits `box` inside
// (width, height) with padding, flipping the y axis.
export function makeView(box, width, height, padding = 0.12) {
  const spanX = box.maxX - box.minX;
  const spanY = box.maxY - box.minY;
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const scale = Math.min(
    (width * (1 - padding)) / spanX,
    (height * (1 - padding)) / spanY
  );
  return {
    scale,
    toCanvas(p) {
      return {
        x: width / 2 + (p.x - cx) * scale,
        y: height / 2 - (p.y - cy) * scale,
      };
    },
  };
}

export function drawGrid(ctx, view, width, height, step = 50) {
  ctx.save();
  ctx.strokeStyle = INK.grid;
  ctx.lineWidth = 1;
  const origin = view.toCanvas({ x: 0, y: 0 });
  ctx.beginPath();
  for (let gx = origin.x % (step * view.scale); gx < width; gx += step * view.scale) {
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height);
  }
  for (let gy = origin.y % (step * view.scale); gy < height; gy += step * view.scale) {
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
  }
  ctx.stroke();

  ctx.strokeStyle = INK.axis;
  ctx.beginPath();
  ctx.moveTo(0, origin.y); ctx.lineTo(width, origin.y);
  ctx.moveTo(origin.x, 0); ctx.lineTo(origin.x, height);
  ctx.stroke();
  ctx.restore();
}

export function drawCurve(ctx, view, samples, currentT) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.strokeStyle = INK.curveRest;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  samples.forEach((s, i) => {
    const c = view.toCanvas(s.p);
    if (i === 0) ctx.moveTo(c.x, c.y); else ctx.lineTo(c.x, c.y);
  });
  ctx.stroke();

  ctx.strokeStyle = INK.curveTraveled;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  let started = false;
  for (const s of samples) {
    if (s.t > currentT) break;
    const c = view.toCanvas(s.p);
    if (!started) { ctx.moveTo(c.x, c.y); started = true; }
    else ctx.lineTo(c.x, c.y);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawEvolute(ctx, view, samples, box) {
  const diag = Math.hypot(box.maxX - box.minX, box.maxY - box.minY);
  const limit = diag * 3;
  ctx.save();
  ctx.strokeStyle = INK.evolute;
  ctx.lineWidth = 1.3;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  let drawing = false;
  for (const s of samples) {
    const center = osculatingCenter(s);
    if (!center || Math.hypot(center.x - s.p.x, center.y - s.p.y) > limit) {
      drawing = false;
      continue;
    }
    const c = view.toCanvas(center);
    if (!drawing) { ctx.moveTo(c.x, c.y); drawing = true; }
    else ctx.lineTo(c.x, c.y);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawComb(ctx, view, samples, combScale, everyN = 12) {
  ctx.save();
  ctx.strokeStyle = INK.comb;
  ctx.lineWidth = 1;
  ctx.beginPath();
  let prevTip = null;
  for (let i = 0; i < samples.length; i += everyN) {
    const s = samples[i];
    const len = s.kappa * combScale;
    const tip = { x: s.p.x + s.normal.x * len, y: s.p.y + s.normal.y * len };
    const c0 = view.toCanvas(s.p);
    const c1 = view.toCanvas(tip);
    ctx.moveTo(c0.x, c0.y);
    ctx.lineTo(c1.x, c1.y);
    prevTip = c1;
  }
  ctx.stroke();
  ctx.restore();
}

export function drawVector(ctx, view, from, dir, length, color, width = 2) {
  const to = { x: from.x + dir.x * length, y: from.y + dir.y * length };
  const c0 = view.toCanvas(from);
  const c1 = view.toCanvas(to);
  const angle = Math.atan2(c1.y - c0.y, c1.x - c0.x);
  const headLen = 9;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(c0.x, c0.y);
  ctx.lineTo(c1.x, c1.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(c1.x, c1.y);
  ctx.lineTo(c1.x - headLen * Math.cos(angle - 0.45), c1.y - headLen * Math.sin(angle - 0.45));
  ctx.lineTo(c1.x - headLen * Math.cos(angle + 0.45), c1.y - headLen * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawOsculatingCircle(ctx, view, frame) {
  const center = osculatingCenter(frame);
  if (!center) return;
  const c = view.toCanvas(center);
  const r = frame.radius * view.scale;
  if (!Number.isFinite(r) || r <= 0 || r > 1e6) return;

  ctx.save();
  ctx.strokeStyle = INK.osculating;
  ctx.lineWidth = 1.3;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = INK.osculating;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawPoint(ctx, view, p) {
  const c = view.toCanvas(p);
  ctx.save();
  ctx.fillStyle = INK.point;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK.bg;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

export function drawCurvatureGraph(ctx, width, height, samples, currentT) {
  ctx.clearRect(0, 0, width, height);
  const kappas = samples.map((s) => s.kappa).filter(Number.isFinite);
  if (kappas.length === 0) return;
  let maxAbs = Math.max(1e-6, ...kappas.map((k) => Math.abs(k)));
  const sorted = kappas.map((k) => Math.abs(k)).sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || maxAbs;
  maxAbs = Math.max(p95 * 1.15, 1e-6);

  const t0 = samples[0].t;
  const t1 = samples[samples.length - 1].t;
  const xOf = (t) => ((t - t0) / (t1 - t0)) * width;
  const yOf = (k) => {
    const clamped = Math.max(-maxAbs, Math.min(maxAbs, k));
    return height / 2 - (clamped / maxAbs) * (height / 2 - 6);
  };

  ctx.strokeStyle = INK.graphZero;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  ctx.strokeStyle = INK.graphLine;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  samples.forEach((s, i) => {
    const x = xOf(s.t);
    const y = yOf(Number.isFinite(s.kappa) ? s.kappa : 0);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const mx = xOf(currentT);
  ctx.strokeStyle = INK.graphMarker;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mx, 0);
  ctx.lineTo(mx, height);
  ctx.stroke();
}
