export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Frame-rate independent damping, based on Freya Holmer's exponential decay smoothing. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}
