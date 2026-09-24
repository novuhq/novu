import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOTION_DISTANCE_PX, MOTION_DURATION_MS, MOTION_EASING, readMotionDurationMs } from './tokens';

const stylesheet = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');
const declaredToken = (name: string) => stylesheet.match(new RegExp(`--nv-motion-${name}:\\s*([^;]+);`))?.[1].trim();

describe('motion tokens', () => {
  it('mirrors the durations, easings and distances declared in index.css', () => {
    for (const [token, ms] of Object.entries(MOTION_DURATION_MS)) {
      expect(declaredToken(`duration-${token}`)).toBe(`${ms}ms`);
    }
    for (const [token, easing] of Object.entries(MOTION_EASING)) {
      expect(declaredToken(`ease-${token}`)?.replace(/\s/g, '')).toBe(easing.replace(/\s/g, ''));
    }
    for (const [token, px] of Object.entries(MOTION_DISTANCE_PX)) {
      expect(declaredToken(`distance-${token}`)).toBe(`${px}px`);
    }
  });

  it('reads a duration as the element sees it and falls back to the constant', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    expect(readMotionDurationMs(element, 'slow')).toBe(MOTION_DURATION_MS.slow);

    element.style.setProperty('--nv-motion-duration-slow', '0.3s');
    expect(readMotionDurationMs(element, 'slow')).toBe(300);

    // The `off` motion mode zeroes the tokens.
    element.style.setProperty('--nv-motion-duration-slow', '0ms');
    expect(readMotionDurationMs(element, 'slow')).toBe(0);

    element.remove();
  });
});
