import { afterEach, describe, expect, it, vi } from 'vitest';
import { roundToDevicePixel } from './floating';

describe('roundToDevicePixel', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('puts a floating element on whole device pixels', () => {
    vi.stubGlobal('devicePixelRatio', 2);
    expect(roundToDevicePixel(144.305)).toBe(144.5);
    expect(roundToDevicePixel(1178.51)).toBe(1178.5);

    vi.stubGlobal('devicePixelRatio', 1);
    expect(roundToDevicePixel(144.305)).toBe(144);
  });
});
