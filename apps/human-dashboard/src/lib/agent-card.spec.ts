import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import QRCode from 'react-qr-code';
import { describe, expect, it } from 'vitest';
import { cardSerialOf, qrModulesOf } from './agent-card';

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

describe('cardSerialOf', () => {
  it('gives the same agent the same four digits every time', () => {
    expect(cardSerialOf('sid')).toBe(cardSerialOf('sid'));
    expect(cardSerialOf('sid')).toMatch(/^\d{4}$/);
  });

  it('gives other agents other numbers', () => {
    const serials = new Set(['sid', 'atlas', 'juno', 'pip', 'otto', 'sid-acme'].map(cardSerialOf));

    expect(serials.size).toBe(6);
  });

  it('pads a small number with zeros', () => {
    const small = Array.from({ length: 2000 }, (_, index) => cardSerialOf(`agent-${index}`)).find((serial) =>
      serial.startsWith('0')
    );

    expect(small).toMatch(/^0\d{3}$/);
  });
});
