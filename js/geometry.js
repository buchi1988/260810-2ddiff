// Generic differential-geometry helpers for a parametric plane curve
// given as x(t), y(t). All derivatives are estimated with central
// differences so the same code works for built-in and user-defined curves.

export function makeDiffStep(t0, t1) {
  const span = Math.abs(t1 - t0) || 1;
  return Math.max(span * 1e-5, 1e-6);
}

export function point(curve, t) {
  return { x: curve.x(t), y: curve.y(t) };
}

export function velocity(curve, t, h) {
  const x1 = (curve.x(t + h) - curve.x(t - h)) / (2 * h);
  const y1 = (curve.y(t + h) - curve.y(t - h)) / (2 * h);
  return { x: x1, y: y1 };
}

export function acceleration(curve, t, h) {
  const x2 = (curve.x(t + h) - 2 * curve.x(t) + curve.x(t - h)) / (h * h);
  const y2 = (curve.y(t + h) - 2 * curve.y(t) + curve.y(t - h)) / (h * h);
  return { x: x2, y: y2 };
}

// Full differential frame at parameter t: position, velocity, speed,
// unit tangent, unit normal (rotate tangent +90deg), signed curvature,
// and radius of curvature (Infinity when curvature is ~0).
//
// Near a cusp (v -> 0, e.g. t = 0 on an astroid) the curvature formula
// divides noise by noise-cubed, which produces huge meaningless finite
// numbers instead of the true singularity. When the raw speed drops below
// `minSpeed`, curvature is reported as undefined (NaN) and the tangent is
// instead estimated from a much wider step, which stays numerically stable
// across the singular point.
export function frameAt(curve, t, h, minSpeed = 1e-3) {
  const p = point(curve, t);
  let v = velocity(curve, t, h);
  let speed = Math.hypot(v.x, v.y);
  const singular = speed < minSpeed;
  if (singular) {
    v = velocity(curve, t, h * 200);
    speed = Math.hypot(v.x, v.y) || 1e-9;
  }
  const tangent = { x: v.x / speed, y: v.y / speed };
  const normal = { x: -tangent.y, y: tangent.x };
  let kappa = NaN;
  if (!singular) {
    const a = acceleration(curve, t, h);
    const denom = Math.pow(v.x * v.x + v.y * v.y, 1.5) || 1e-12;
    kappa = (v.x * a.y - v.y * a.x) / denom;
  }
  const radius = Number.isFinite(kappa) && Math.abs(kappa) > 1e-9 ? 1 / kappa : Infinity;
  return { t, p, v, speed, tangent, normal, kappa, radius, singular };
}

export function osculatingCenter(frame) {
  if (!Number.isFinite(frame.radius)) return null;
  return {
    x: frame.p.x + frame.radius * frame.normal.x,
    y: frame.p.y + frame.radius * frame.normal.y,
  };
}

// Dense sample of the curve, reused for rendering, hit-testing and
// curvature/arc-length estimates.
export function sampleCurve(curve, n = 800) {
  const h = makeDiffStep(curve.t0, curve.t1);
  const pts = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const t = curve.t0 + ((curve.t1 - curve.t0) * i) / n;
    const f = frameAt(curve, t, h);
    pts[i] = f;
  }
  return pts;
}

// Arc length from t0 up to t, via trapezoidal integration of |v(t)| over
// the precomputed dense samples (fast and accurate enough for display).
export function arcLengthTo(samples, t) {
  let s = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    if (b.t > t) {
      const frac = a.t === b.t ? 0 : (t - a.t) / (b.t - a.t);
      s += ((a.speed + (a.speed + (b.speed - a.speed) * frac)) / 2) * (t - a.t);
      return s;
    }
    s += ((a.speed + b.speed) / 2) * (b.t - a.t);
  }
  return s;
}

export function totalArcLength(samples) {
  let s = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    s += ((samples[i].speed + samples[i + 1].speed) / 2) * (samples[i + 1].t - samples[i].t);
  }
  return s;
}

export function boundingBox(samples) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of samples) {
    if (s.p.x < minX) minX = s.p.x;
    if (s.p.x > maxX) maxX = s.p.x;
    if (s.p.y < minY) minY = s.p.y;
    if (s.p.y > maxY) maxY = s.p.y;
  }
  if (!Number.isFinite(minX)) return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
  if (minX === maxX) { minX -= 1; maxX += 1; }
  if (minY === maxY) { minY -= 1; maxY += 1; }
  return { minX, maxX, minY, maxY };
}
