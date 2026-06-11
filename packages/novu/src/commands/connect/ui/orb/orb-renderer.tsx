import { Box, Text } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';

export const ORB_FRAME_MS = 100;
const ENTRY_MS = 1200;

export function PersistentOrb({
  tintColor,
  label,
  previewMorphProgress,
  paused = false,
}: {
  tintColor: string;
  label: string | undefined;
  previewMorphProgress: number | null;
  /** When true, freeze the orb so URL lines beneath it are not redrawn every frame. */
  paused?: boolean;
}): React.ReactElement {
  const [frame, setFrame] = React.useState(0);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const bornAtRef = React.useRef(Date.now());

  React.useEffect(() => {
    if (paused) return;

    const t = setInterval(() => {
      setFrame((f) => f + 1);
      setElapsedMs(Date.now() - bornAtRef.current);
    }, ORB_FRAME_MS);

    return () => clearInterval(t);
  }, [paused]);

  const entryProgress = Math.min(1, elapsedMs / ENTRY_MS);
  // Ease-out cubic — fast start, gentle landing. Plays nicer than linear
  // and avoids the "snap to full size" feel of ease-in.
  const scale = 1 - (1 - entryProgress) ** 3;
  const morphProgress = previewMorphProgress ?? 1;

  return <Orb phase={frame} scale={scale} tintColor={tintColor} label={label} morphProgress={morphProgress} />;
}

// ---------------------------------------------------------------------------
// Orb renderer — dithered monochrome braille sphere
// ---------------------------------------------------------------------------
//
// Render path:
//
// - Virtual pixel buffer is 2× wider and 4× taller than the displayed grid.
//   Each terminal cell packs eight pixels (2 cols × 4 rows) into a single
//   Unicode braille character (U+2800–U+28FF), where each pixel maps to one
//   of the eight dot bits. ~84 × 48 pixel canvas in only 42 × 12 terminal cells.
//
// - Sphere shading is plain Lambert lighting: at each pixel we reconstruct
//   the sphere's normal from (sx, sy), the implied z = √(1 − r²), and dot
//   with a light direction that slowly rotates around the vertical axis so
//   the highlight drifts across the surface.
//
// - The continuous brightness signal is thresholded through an 8×8 Bayer
//   matrix to produce the classic 1-bit ordered-dithered look. Lit hemisphere
//   shows dense dots, terminator dissolves into sparser patterns, the unlit
//   hemisphere goes dark.
//
// - `scale` (0..1) shrinks the orb's effective radius. Stars stay visible
//   throughout — they're our floor of "something is on screen" during the
//   entry animation when the orb itself is still a dot.
//
// - The whole thing renders as one Text per row (one color), which keeps
//   Ink's reconciler cheap even at 10 fps.

const PX_W = 84;
const PX_H = 48;
const TERM_W = PX_W / 2;
const TERM_H = PX_H / 4;
const PX_CX = 42;
const PX_CY = 24;
const ORB_RADIUS = 22;

// Standard 8×8 Bayer dithering matrix, values 0–63. Lookup is `BAYER_8[y & 7][x & 7] / 64`,
// giving a threshold in [0, 1) compared against the pixel's brightness.
const BAYER_8: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

// Bit positions for each dot in a 2×4 braille cell (column, row in the cell).
const BRAILLE_BITS: ReadonlyArray<{ dx: number; dy: number; bit: number }> = [
  { dx: 0, dy: 0, bit: 0x01 },
  { dx: 0, dy: 1, bit: 0x02 },
  { dx: 0, dy: 2, bit: 0x04 },
  { dx: 1, dy: 0, bit: 0x08 },
  { dx: 1, dy: 1, bit: 0x10 },
  { dx: 1, dy: 2, bit: 0x20 },
  { dx: 0, dy: 3, bit: 0x40 },
  { dx: 1, dy: 3, bit: 0x80 },
];

export function Orb({
  phase,
  scale,
  tintColor,
  label,
  morphProgress = 1,
}: {
  phase: number;
  scale: number;
  tintColor: string;
  label: string | undefined;
  morphProgress?: number;
}): React.ReactElement {
  const rows: React.ReactElement[] = [];
  for (let row = 0; row < TERM_H; row++) {
    let line = '';
    for (let col = 0; col < TERM_W; col++) {
      const baseX = col * 2;
      const baseY = row * 4;
      let code = 0x2800;
      for (const dot of BRAILLE_BITS) {
        if (samplePixel(baseX + dot.dx, baseY + dot.dy, phase, scale, label, morphProgress)) {
          code |= dot.bit;
        }
      }
      line += String.fromCharCode(code);
    }
    rows.push(
      <Text key={row} color={tintColor}>
        {line}
      </Text>
    );
  }

  return <Box flexDirection="column">{rows}</Box>;
}

// 5×7 binary glyphs covering A C E G H I K L M P R S T W — every uppercase
// letter we need for SLACK / TELEGRAM / EMAIL / WHATSAPP / TEAMS. '1' = lit
// pixel, '0' = transparent (defers to the sphere shading underneath).
const GLYPH_W = 5;
const GLYPH_H = 7;
const GLYPHS: Record<string, ReadonlyArray<string>> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10001', '10001', '10001', '10001'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
};

/**
 * Returns true if `(px, py)` is a lit pixel of the `label` text rendered
 * centered in the sphere. Spacing tightens to 0 for words >5 letters so
 * TELEGRAM/WHATSAPP fit inside the 44-pixel sphere diameter without
 * clipping at the edges.
 */
function isLabelPixel(px: number, py: number, label: string | undefined): boolean {
  if (!label) return false;
  const spacing = label.length <= 5 ? 1 : 0;
  const stride = GLYPH_W + spacing;
  const totalW = label.length * GLYPH_W + (label.length - 1) * spacing;
  const left = PX_CX - Math.floor(totalW / 2);
  const top = PX_CY - Math.floor(GLYPH_H / 2);
  const lx = px - left;
  const ly = py - top;
  if (lx < 0 || lx >= totalW || ly < 0 || ly >= GLYPH_H) return false;
  const letterIdx = Math.floor(lx / stride);
  if (letterIdx >= label.length) return false;
  const innerX = lx - letterIdx * stride;
  if (innerX >= GLYPH_W) return false; // in inter-letter gap
  const bitmap = GLYPHS[label[letterIdx]];
  if (!bitmap) return false;

  return bitmap[ly][innerX] === '1';
}

function samplePixel(
  px: number,
  py: number,
  phase: number,
  scale: number,
  label: string | undefined,
  morphProgress = 1
): boolean {
  const morphActive = morphProgress < 1;
  const morphRipple = morphActive ? 1 - morphProgress : 0;
  const morphScaleBoost = morphActive ? 0.16 * Math.sin(morphProgress * Math.PI) : 0;
  // Effective radius shrinks with `scale` during the entry animation. At
  // scale=0 the sphere has no radius — every "inside" check fails — and only
  // the starfield is visible. At scale=1 the sphere is full-size.
  const effectiveR = Math.max(0.001, ORB_RADIUS * scale * (1 + morphScaleBoost));
  let sx = (px - PX_CX) / effectiveR;
  let sy = (py - PX_CY) / effectiveR;

  if (morphRipple > 0) {
    sx += morphRipple * 0.08 * Math.sin(py * 0.22 + phase * 0.3);
    sy += morphRipple * 0.08 * Math.cos(px * 0.22 - phase * 0.25);
  }

  const r2 = sx * sx + sy * sy;

  if (r2 < 1) {
    // Reconstruct z from the sphere equation (front hemisphere) → unit
    // normal at this pixel for shading.
    const sz = Math.sqrt(1 - r2);

    // Light direction: rotating slowly around the vertical axis so the
    // bright pole drifts left-to-right. Offset slightly downward to feel
    // like a natural overhead-front desk-lamp position.
    const t = phase * 0.04;
    const lx = Math.cos(t) * 0.65;
    const ly = -0.45;
    const lz = Math.sqrt(Math.max(0.01, 1 - lx * lx - ly * ly));

    const lambert = Math.max(0, sx * lx + sy * ly + sz * lz);

    // Tight specular — small bright cluster of dots tracking the light
    // direction, sells the "smooth glass sphere" feel.
    const spec = lambert ** 12 * (0.35 + morphRipple * 0.3);

    // A hair of ambient so the unlit side still occasionally lights up a
    // pixel through the dither — keeps the terminator alive.
    let intensity = Math.min(1, lambert * 0.85 + spec + 0.04);

    // Label overlay: boost intensity to nearly-on at label pixels so the
    // word reads as a dense cluster, but still pass through the Bayer
    // threshold so the same dotted texture as the rest of the orb applies —
    // the text blends INTO the sphere rather than being a solid override.
    // Gated on the entry animation being mostly complete so the label
    // doesn't pop in mid-grow.
    if (scale > 0.85 && isLabelPixel(px, py, label)) {
      intensity = 0.95;
    }

    const threshold = BAYER_8[py & 7][px & 7] / 64;

    return intensity > threshold;
  }

  // ---------------------------------------------------------------------
  // Outside the sphere
  // ---------------------------------------------------------------------

  // Plasma wisps: subtle tendrils that occasionally extend just past the
  // sphere edge and pull back, suggesting the orb is alive without
  // breaking its circular silhouette.
  //
  // Calmed-down design:
  // - Reach is short (`WISP_REACH = 0.22`) so wisps hug the surface.
  // - Steep quadratic falloff so density drops sharply with distance.
  // - Low spatial frequencies → smooth, large shapes (not jittery detail).
  // - Slow temporal coefficients → gentle evolution.
  // - Negative bias so most of the time the wisp field is quiet; only
  //   the positive peaks of the superposed sines become visible.
  // - `WISP_DELAY_FRAMES` keeps the field completely off until the
  //   sphere has been fully visible for ~2 s — gives the user a clean
  //   circle to read first, then wisps fade in over `WISP_FADE_FRAMES`.
  if (scale > 0.95) {
    const WISP_DELAY_FRAMES = 20; // ~2 s after mount
    const WISP_FADE_FRAMES = 20; // ~2 s ramp-in
    const ambientActivation = Math.max(0, Math.min(1, (phase - WISP_DELAY_FRAMES) / WISP_FADE_FRAMES));
    const activation = Math.max(morphRipple * 0.9, ambientActivation);
    if (activation > 0) {
      const d = Math.sqrt(r2);
      const WISP_REACH = 0.22 + morphRipple * 0.2;
      if (d < 1 + WISP_REACH) {
        const proximityLinear = Math.max(0, 1 - (d - 1) / WISP_REACH);
        const proximity = proximityLinear * proximityLinear; // quadratic falloff
        const noise =
          Math.sin(sx * 3 + phase * 0.05) * 0.3 +
          Math.sin(sy * 2.5 - phase * 0.035) * 0.3 +
          Math.sin((sx + sy) * 2 + phase * 0.04) * 0.2 +
          Math.sin((sx - sy) * 2.5 - phase * 0.03) * 0.2;
        const intensity = Math.max(0, noise * 0.45 - 0.15) * proximity * activation;
        const threshold = BAYER_8[py & 7][px & 7] / 64;
        if (intensity > threshold) return true;
      }
    }
  }

  // Background starfield — sparse, stable, phase-independent so the
  // distant stars don't twitch behind a steady sphere. Visible from
  // frame 0 so the canvas isn't empty during entry.
  const starSeed = (px * 137 + py * 211) % 4001;
  if (starSeed === 0) return true;
  if (starSeed === 1117) return true;
  if (starSeed === 2531) return true;
  if (starSeed === 3203) return true;

  return false;
}
