import { PRESETS, getPreset } from "./curves.js";
import { compileExpression } from "./expr.js";
import {
  makeDiffStep, frameAt, sampleCurve, arcLengthTo, boundingBox,
} from "./geometry.js";
import {
  fitCanvas, makeView, drawGrid, drawCurve, drawEvolute, drawComb,
  drawVector, drawOsculatingCircle, drawPoint, drawCurvatureGraph, INK,
} from "./render.js";

const els = {
  curveSelect: document.getElementById("curve-select"),
  customBlock: document.getElementById("custom-curve"),
  customX: document.getElementById("custom-x"),
  customY: document.getElementById("custom-y"),
  customT0: document.getElementById("custom-t0"),
  customT1: document.getElementById("custom-t1"),
  applyCustom: document.getElementById("apply-custom"),
  customError: document.getElementById("custom-error"),
  tSlider: document.getElementById("t-slider"),
  tValue: document.getElementById("t-value"),
  playBtn: document.getElementById("play-btn"),
  speed: document.getElementById("speed"),
  showTangent: document.getElementById("show-tangent"),
  showNormal: document.getElementById("show-normal"),
  showOsculating: document.getElementById("show-osculating"),
  showComb: document.getElementById("show-comb"),
  showEvolute: document.getElementById("show-evolute"),
  showGrid: document.getElementById("show-grid"),
  curveCanvas: document.getElementById("curve-canvas"),
  curvatureCanvas: document.getElementById("curvature-canvas"),
  valT: document.getElementById("val-t"),
  valP: document.getElementById("val-p"),
  valSpeed: document.getElementById("val-speed"),
  valTangent: document.getElementById("val-tangent"),
  valNormal: document.getElementById("val-normal"),
  valKappa: document.getElementById("val-kappa"),
  valRadius: document.getElementById("val-radius"),
  valArclen: document.getElementById("val-arclen"),
};

for (const preset of PRESETS) {
  const opt = document.createElement("option");
  opt.value = preset.id;
  opt.textContent = preset.name;
  els.curveSelect.appendChild(opt);
}

const state = {
  curve: null,
  samples: [],
  box: null,
  t: 0,
  playing: false,
  lastFrameTime: 0,
  dragging: false,
};

function fmt(n, digits = 3) {
  if (!Number.isFinite(n)) return "∞";
  return n.toFixed(digits);
}

function setCurve(preset) {
  state.curve = preset;
  state.samples = sampleCurve(preset, 900);
  state.box = boundingBox(state.samples);
  state.t = preset.t0;

  els.tSlider.min = String(preset.t0);
  els.tSlider.max = String(preset.t1);
  els.tSlider.step = String((preset.t1 - preset.t0) / 4000);
  els.tSlider.value = String(state.t);

  render();
}

function applyCustomCurve() {
  els.customError.hidden = true;
  try {
    const xFn = compileExpression(els.customX.value);
    const yFn = compileExpression(els.customY.value);
    const t0 = Number(els.customT0.value);
    const t1 = Number(els.customT1.value);
    if (!Number.isFinite(t0) || !Number.isFinite(t1) || t0 === t1) {
      throw new Error("t の範囲が不正です");
    }
    const preset = { id: "custom", name: "カスタム", x: xFn, y: yFn, t0: Math.min(t0, t1), t1: Math.max(t0, t1), periodic: false };
    setCurve(preset);
  } catch (err) {
    els.customError.textContent = `式エラー: ${err.message}`;
    els.customError.hidden = false;
  }
}

els.curveSelect.addEventListener("change", () => {
  const id = els.curveSelect.value;
  els.customBlock.hidden = id !== "custom";
  if (id === "custom") {
    applyCustomCurve();
  } else {
    setCurve(getPreset(id));
  }
});

els.applyCustom.addEventListener("click", applyCustomCurve);

els.tSlider.addEventListener("input", () => {
  state.t = Number(els.tSlider.value);
  render();
});

els.playBtn.addEventListener("click", () => {
  state.playing = !state.playing;
  els.playBtn.textContent = state.playing ? "⏸ 一時停止" : "▶ 再生";
  els.playBtn.setAttribute("aria-pressed", String(state.playing));
  if (state.playing) {
    state.lastFrameTime = performance.now();
    requestAnimationFrame(tick);
  }
});

for (const cb of [els.showTangent, els.showNormal, els.showOsculating, els.showComb, els.showEvolute, els.showGrid]) {
  cb.addEventListener("change", render);
}

function tick(now) {
  if (!state.playing) return;
  const dt = (now - state.lastFrameTime) / 1000;
  state.lastFrameTime = now;
  const speed = Number(els.speed.value);
  const domain = state.curve.t1 - state.curve.t0;
  const periodSeconds = 8;
  state.t += (domain / periodSeconds) * speed * dt;
  if (state.t > state.curve.t1) {
    state.t = state.curve.periodic ? state.curve.t0 + ((state.t - state.curve.t0) % domain) : state.curve.t1;
    if (!state.curve.periodic) { state.playing = false; els.playBtn.textContent = "▶ 再生"; els.playBtn.setAttribute("aria-pressed", "false"); }
  }
  els.tSlider.value = String(state.t);
  render();
  if (state.playing) requestAnimationFrame(tick);
}

function nearestSampleIndex(canvasX, canvasY, view) {
  let bestI = 0;
  let bestD = Infinity;
  for (let i = 0; i < state.samples.length; i++) {
    const c = view.toCanvas(state.samples[i].p);
    const d = (c.x - canvasX) ** 2 + (c.y - canvasY) ** 2;
    if (d < bestD) { bestD = d; bestI = i; }
  }
  return bestI;
}

function pointerToT(evt) {
  const rect = els.curveCanvas.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  const view = makeView(state.box, rect.width, rect.height);
  const i = nearestSampleIndex(x, y, view);
  return state.samples[i].t;
}

els.curveCanvas.addEventListener("pointerdown", (evt) => {
  state.dragging = true;
  state.playing = false;
  els.playBtn.textContent = "▶ 再生";
  els.playBtn.setAttribute("aria-pressed", "false");
  els.curveCanvas.setPointerCapture(evt.pointerId);
  state.t = pointerToT(evt);
  els.tSlider.value = String(state.t);
  render();
});

els.curveCanvas.addEventListener("pointermove", (evt) => {
  if (!state.dragging) return;
  state.t = pointerToT(evt);
  els.tSlider.value = String(state.t);
  render();
});

window.addEventListener("pointerup", () => { state.dragging = false; });

window.addEventListener("resize", render);

function updateReadout(frame, arcLen) {
  els.tValue.textContent = fmt(frame.t, 3);
  els.valT.textContent = fmt(frame.t, 4);
  els.valP.textContent = `(${fmt(frame.p.x, 2)}, ${fmt(frame.p.y, 2)})`;
  els.valSpeed.textContent = fmt(frame.speed, 3);
  els.valTangent.textContent = `(${fmt(frame.tangent.x, 3)}, ${fmt(frame.tangent.y, 3)})`;
  els.valNormal.textContent = `(${fmt(frame.normal.x, 3)}, ${fmt(frame.normal.y, 3)})`;
  els.valKappa.textContent = fmt(frame.kappa, 5);
  els.valRadius.textContent = Number.isFinite(frame.radius) ? fmt(frame.radius, 2) : "∞";
  els.valArclen.textContent = fmt(arcLen, 3);
}

function render() {
  if (!state.curve) return;
  const { ctx, width, height } = fitCanvas(els.curveCanvas);
  ctx.clearRect(0, 0, width, height);
  const view = makeView(state.box, width, height);

  if (els.showGrid.checked) drawGrid(ctx, view, width, height);

  if (els.showEvolute.checked) drawEvolute(ctx, view, state.samples, state.box);

  drawCurve(ctx, view, state.samples, state.t);

  const h = makeDiffStep(state.curve.t0, state.curve.t1);
  const frame = frameAt(state.curve, state.t, h);

  if (els.showComb.checked) {
    const diag = Math.hypot(state.box.maxX - state.box.minX, state.box.maxY - state.box.minY);
    const kappaAbsMax = Math.max(1e-6, ...state.samples.map((s) => Math.abs(s.kappa)).filter(Number.isFinite));
    const combScale = (diag * 0.12) / kappaAbsMax;
    drawComb(ctx, view, state.samples, combScale);
  }

  if (els.showOsculating.checked) drawOsculatingCircle(ctx, view, frame);

  const vecLen = Math.hypot(state.box.maxX - state.box.minX, state.box.maxY - state.box.minY) * 0.14;
  if (els.showNormal.checked) drawVector(ctx, view, frame.p, frame.normal, vecLen, INK.normal, 2);
  if (els.showTangent.checked) drawVector(ctx, view, frame.p, frame.tangent, vecLen, INK.tangent, 2.4);

  drawPoint(ctx, view, frame.p);

  const arcLen = arcLengthTo(state.samples, state.t);
  updateReadout(frame, arcLen);

  const g = fitCanvas(els.curvatureCanvas);
  drawCurvatureGraph(g.ctx, g.width, g.height, state.samples, state.t);
}

setCurve(getPreset("circle"));
