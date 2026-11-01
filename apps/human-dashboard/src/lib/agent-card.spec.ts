import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QRCode from 'react-qr-code';
import { describe, expect, it } from 'vitest';
import { qrModulesOf } from './agent-card';

/** How many modules across the library really draws the code for `value`. */
function drawnModules(value: string): number {
  const svg = renderToStaticMarkup(createElement(QRCode, { value, level: 'L' }));
  const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);

  return Number(viewBox?.[1]);
}

describe('qrModulesOf', () => {
  it('agrees with what the library draws, at every length a card link or address can reach', () => {
    for (let length = 1; length <= 140; length += 1) {
      const value = 'a'.repeat(length);

      expect(qrModulesOf(value), `${length} bytes`).toBe(drawnModules(value));
    }
  });

  it.each([
    ['a short handle', 'https://agentinbox.md/p/atlas', 25],
    ['the longest handle', `https://www.agentinbox.md/p/${'a'.repeat(32)}`, 33],
  ])('sizes %s', (_case, value, modules) => {
    expect(qrModulesOf(value)).toBe(modules);
  });

  it('counts bytes, not characters', () => {
    expect(qrModulesOf('é'.repeat(17))).toBe(drawnModules('é'.repeat(17)));
  });
});
