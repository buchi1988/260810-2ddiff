const TAU = Math.PI * 2;

export const PRESETS = [
  {
    id: "circle",
    name: "円",
    t0: 0, t1: TAU, periodic: true,
    x: (t) => 100 * Math.cos(t),
    y: (t) => 100 * Math.sin(t),
  },
  {
    id: "ellipse",
    name: "楕円",
    t0: 0, t1: TAU, periodic: true,
    x: (t) => 150 * Math.cos(t),
    y: (t) => 85 * Math.sin(t),
  },
  {
    id: "parabola",
    name: "放物線",
    t0: -160, t1: 160, periodic: false,
    x: (t) => t,
    y: (t) => 0.008 * t * t - 90,
  },
  {
    id: "sine",
    name: "正弦曲線",
    t0: -220, t1: 220, periodic: false,
    x: (t) => t,
    y: (t) => 80 * Math.sin(t / 40),
  },
  {
    id: "cycloid",
    name: "サイクロイド",
    t0: 0, t1: 4 * TAU, periodic: false,
    x: (t) => 30 * (t - Math.sin(t)) - 190,
    y: (t) => 30 * (1 - Math.cos(t)) - 60,
  },
  {
    id: "astroid",
    name: "アステロイド",
    t0: 0, t1: TAU, periodic: true,
    x: (t) => 140 * Math.pow(Math.cos(t), 3),
    y: (t) => 140 * Math.pow(Math.sin(t), 3),
  },
  {
    id: "cardioid",
    name: "カージオイド",
    t0: 0, t1: TAU, periodic: true,
    x: (t) => 60 * (2 * Math.cos(t) - Math.cos(2 * t)),
    y: (t) => 60 * (2 * Math.sin(t) - Math.sin(2 * t)),
  },
  {
    id: "spiral",
    name: "対数螺旋",
    t0: 0, t1: 4 * TAU, periodic: false,
    x: (t) => 6 * Math.exp(0.15 * t) * Math.cos(t),
    y: (t) => 6 * Math.exp(0.15 * t) * Math.sin(t),
  },
  {
    id: "lissajous",
    name: "リサージュ曲線",
    t0: 0, t1: TAU, periodic: true,
    x: (t) => 150 * Math.sin(3 * t + Math.PI / 2),
    y: (t) => 100 * Math.sin(2 * t),
  },
  {
    id: "custom",
    name: "カスタム（式を入力）",
    t0: 0, t1: TAU, periodic: false,
    x: (t) => Math.cos(t),
    y: (t) => Math.sin(t) * Math.sin(3 * t),
  },
];

export function getPreset(id) {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}
