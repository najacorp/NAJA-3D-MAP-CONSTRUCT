// SPDX-License-Identifier: GPL-3.0-only
import { describe, expect, it } from 'vitest';
import { joystickVector, rendererKind } from '../src/viewer/navigation';
describe('viewer input', () => {
  it('clamps the joystick to its circular boundary', () => {
    expect(joystickVector(30, 40, 50)).toEqual({ x: 0.6, y: 0.8 });
    expect(joystickVector(60, 80, 50)).toEqual({ x: 0.6, y: 0.8 });
    expect(joystickVector(3, 4, 0)).toEqual({ x: 0, y: 0 });
  });
  it('detects common software renderers and reports unavailable data', () => {
    expect(rendererKind('ANGLE (Google, Vulkan SwiftShader)')).toBe('CPU');
    expect(rendererKind('Mesa llvmpipe')).toBe('CPU');
    expect(rendererKind('NVIDIA GeForce')).toBe('GPU');
    expect(rendererKind(null)).toBe('unknown');
  });
});
