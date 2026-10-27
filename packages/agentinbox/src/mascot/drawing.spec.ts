import { describe, expect, it } from 'vitest';
import {
  drawMascot,
  EYE,
  eyeBoxes,
  MASCOT_WIDTHS,
  type MascotDots,
  type MascotFace,
  mascotLines,
  toCells,
} from './drawing';

const OPEN: MascotFace = { blink: 0, joy: 0 };
const SHUT: MascotFace = { blink: 1, joy: 0 };
const HAPPY: MascotFace = { blink: 0, joy: 1 };
const STILL = { shimmer: 0 };

/** The dots of one level, as `[column, row]`, in the left half or the right half. */
function dotsOf({ levels, width }: MascotDots, level: number, half?: 'left' | 'right'): Array<[number, number]> {
  const found: Array<[number, number]> = [];
  levels.forEach((value, index) => {
    const column = index % width;
    if (value === level && (!half || (half === 'left') === column < width / 2)) {
      found.push([column, Math.floor(index / width)]);
    }
  });

  return found;
}

/** Where an eye's dots sit, top to bottom: their first and last rows, and the middle between. */
function eyeRows(dots: MascotDots, half: 'left' | 'right') {
  const rows = dotsOf(dots, EYE, half).map(([, row]) => row);
  const [top, bottom] = [Math.min(...rows), Math.max(...rows)];

  return { top, bottom, middle: (top + bottom + 1) / 2 };
}

describe('drawMascot', () => {
  it('comes in three widths, 40, 32 and 24 columns, and as many lines as keep it round', () => {
    for (const width of MASCOT_WIDTHS) {
      for (const aspect of [1, 1.18]) {
        const dots = drawMascot(width, OPEN, { aspect });
        const cells = toCells(dots);

        expect(cells).toHaveLength(mascotLines(width, aspect));
        expect(cells.every((line) => line.length === width / 2)).toBe(true);
      }
    }

    expect(MASCOT_WIDTHS.map((width) => mascotLines(width, 1))).toEqual([20, 16, 12]);
    expect(MASCOT_WIDTHS.map((width) => mascotLines(width, 1.18))).toEqual([17, 14, 11]);
  });

  it('draws a round sphere that fills its middle, on square dots and on tall ones', () => {
    for (const aspect of [1, 1.3]) {
      const dots = drawMascot(80, OPEN, { ...STILL, aspect });
      // The sphere is drawn nearly solid, so its lit dots outline it; the halo's are much sparser.
      const sphere = dotsOf(dots, 3).concat(dotsOf(dots, 4), dotsOf(dots, 5), dotsOf(dots, 6));
      const columns = sphere.map(([column]) => column);
      const rows = sphere.map(([, row]) => row);
      const across = Math.max(...columns) - Math.min(...columns) + 1;
      const down = (Math.max(...rows) - Math.min(...rows) + 1) * aspect;

      expect(Math.abs(across - down) / across).toBeLessThan(0.08);
      const middle = dots.levels[Math.floor(dots.height / 2) * dots.width + dots.width / 2 + 6];
      expect(middle).toBeGreaterThanOrEqual(3);
    }
  });

  it('has two open eyes awake, the happy arcs smiling, and a thin line for each when asleep', () => {
    const open = drawMascot(64, OPEN, STILL);
    const happy = drawMascot(64, HAPPY, STILL);
    const shut = drawMascot(64, SHUT, STILL);

    for (const half of ['left', 'right'] as const) {
      expect(eyeRows(open, half).bottom - eyeRows(open, half).top).toBeGreaterThanOrEqual(6);
      expect(dotsOf(happy, EYE, half).length).toBeGreaterThan(10);
      expect(eyeRows(shut, half).bottom - eyeRows(shut, half).top).toBeLessThanOrEqual(2);
    }
  });

  it('never moves the eyes: their middles stay within half a dot as they blink and as they smile', () => {
    for (const width of MASCOT_WIDTHS) {
      // On the smallest grid the thin arc of a full smile rounds to whole dots, one above the open eye's middle.
      const within = width === 48 ? 1 : 0.5;
      for (const aspect of [1, 1.18]) {
        const open = drawMascot(width, OPEN, { ...STILL, aspect });

        for (let step = 0; step <= 10; step += 1) {
          const share = step / 10;
          for (const face of [
            { blink: share, joy: 0 },
            { blink: 0, joy: share },
          ]) {
            const dots = drawMascot(width, face, { ...STILL, aspect });
            for (const half of ['left', 'right'] as const) {
              expect(Math.abs(eyeRows(dots, half).middle - eyeRows(open, half).middle)).toBeLessThanOrEqual(within);
            }
          }
        }
      }
    }
  });

  it('keeps both eyes level, and the same shape mirrored', () => {
    for (const face of [OPEN, SHUT, HAPPY]) {
      const dots = drawMascot(64, face, STILL);

      expect(eyeRows(dots, 'left')).toEqual(eyeRows(dots, 'right'));
      expect(dotsOf(dots, EYE, 'left')).toHaveLength(dotsOf(dots, EYE, 'right').length);
    }
  });

  it('lines the open eyes up with the braille cells: sides on 2-dot columns, the lower edge on a 4-row line', () => {
    for (const width of MASCOT_WIDTHS) {
      for (const aspect of [1, 1.18]) {
        const dots = drawMascot(width, OPEN, { ...STILL, aspect });

        for (const half of ['left', 'right'] as const) {
          const columns = dotsOf(dots, EYE, half).map(([column]) => column);
          expect(Math.min(...columns) % 2).toBe(0);
          expect((Math.max(...columns) + 1) % 2).toBe(0);
          expect((eyeRows(dots, half).bottom + 1) % 4).toBe(0);
        }
      }
    }
  });

  it('shimmers by lighting other dots, never by changing their colours, and not at all when still', () => {
    const before = drawMascot(64, OPEN, { time: 0 });
    const after = drawMascot(64, OPEN, { time: 2000 });
    let moved = 0;

    before.levels.forEach((level, index) => {
      const later = after.levels[index];
      if (level !== later) {
        moved += 1;
        // A dot only comes or goes; one that is there in both has the same colour.
        expect(level === 0 || later === 0).toBe(true);
      }
    });
    expect(moved).toBeGreaterThan(0);
    expect(drawMascot(64, OPEN, { time: 0, shimmer: 0 }).levels).toEqual(
      drawMascot(64, OPEN, { time: 2000, shimmer: 0 }).levels
    );
  });

  it('leaves the eyes out on a light background, so it shows through where they are', () => {
    for (const face of [OPEN, HAPPY, SHUT, { blink: 0, joy: 0.5 }]) {
      const dark = drawMascot(64, face, STILL);
      const light = drawMascot(64, face, { ...STILL, theme: 'light' });

      expect(dotsOf(light, EYE)).toEqual([]);
      for (const [column, row] of dotsOf(dark, EYE)) {
        expect(light.levels[row * light.width + column]).toBe(0);
      }
      // Everything else is drawn the same.
      dark.levels.forEach((level, index) => {
        if (level !== EYE) {
          expect(light.levels[index]).toBe(level);
        }
      });
    }
  });
});

describe('toCells', () => {
  it('turns each 2 x 4 block of dots into the braille character with those dots', () => {
    const levels = new Uint8Array(4 * 4);
    // Left cell: all 8 dots. Right cell: only its top left one.
    for (const [column, row] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
      [1, 2],
      [0, 3],
      [1, 3],
      [2, 0],
    ]) {
      levels[row * 4 + column] = 3;
    }
    levels[2] = 5;

    expect(toCells({ levels, width: 4, height: 4 })).toEqual([
      [
        { char: '⣿', level: 3 },
        { char: '⠁', level: 5 },
      ],
    ]);
  });

  it('gives a character the colour of its brightest dot, and none to an empty one', () => {
    const levels = new Uint8Array([1, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    expect(toCells({ levels, width: 4, height: 4 })).toEqual([[{ char: '⠑', level: 6 }, null]]);
  });

  it('shows only eye dots inside each eye, so no orange is left boxed in under a smile', () => {
    for (const width of MASCOT_WIDTHS) {
      for (const aspect of [1, 1.3]) {
        for (let step = 0; step <= 10; step += 1) {
          const dots = drawMascot(width, { blink: 0, joy: step / 10 }, { ...STILL, aspect });
          const cells = toCells(dots);
          const boxes = eyeBoxes(dots);

          expect(boxes).toHaveLength(2);
          for (const box of boxes) {
            for (let line = box.top; line <= box.bottom; line += 1) {
              for (let cell = box.left; cell <= box.right; cell += 1) {
                expect([EYE, undefined]).toContain(cells[line][cell]?.level);
              }
            }
          }
        }
      }
    }
  });
});
