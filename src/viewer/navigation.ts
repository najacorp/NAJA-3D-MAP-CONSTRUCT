// SPDX-License-Identifier: GPL-3.0-only
/** Clamp a joystick offset to a unit circle. */
export function joystickVector(x: number, y: number, radius: number): { x: number; y: number } {
  if (radius <= 0) return { x: 0, y: 0 };
  const distance = Math.hypot(x, y);
  const divisor = Math.max(radius, distance);
  return { x: x / divisor, y: y / divisor };
}
export function rendererKind(renderer: string | null): 'CPU' | 'GPU' | 'unknown' {
  if (!renderer) return 'unknown';
  return /swiftshader|llvmpipe|softpipe|software|lavapipe/i.test(renderer) ? 'CPU' : 'GPU';
}
