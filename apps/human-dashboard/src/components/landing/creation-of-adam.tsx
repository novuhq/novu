'use client';

import { useEffect, useRef } from 'react';

/** Michelangelo, The Creation of Adam (1512), the hands. Public domain. */
const FRESCO_SRC = '/illustrations/creation-of-adam.jpg';

const BG = [10, 9, 8];
const DOT_FAINT = [64, 59, 52];
const DOT_DIM = [126, 116, 101];
const DOT_BRIGHT = [238, 229, 216];
const EMBER = [255, 92, 48];

/** An 8×8 Bayer matrix, as thresholds between 0 and 1. */
const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map((row) => row.map((value) => (value + 0.5) / 64));

/** The gap between the fingertips, as a fraction of the image. */
const SPARK = { x: 0.535, y: 0.45 };

/** One lub-dub. */
const HEART_MS = 3600;

const FRAME_MS = 1000 / 30;

/**
 * fig. 01: the hands of the fresco, drawn live as an 8×8 Bayer ordered dither. They surface from the dark
 * as fields of dots, and in the gap between the fingertips a small ember keeps a heartbeat. The pointer
 * warms the dots under it. It only runs while on screen, and holds still mid-beat for reduced motion.
 */
export function CreationOfAdam({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !context) {
      return;
    }

    return animateFresco(canvas, context);
  }, []);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Michelangelo's Creation of Adam hands, rendered as animated dithered dots — an agent reaching for a human."
      className={className}
    />
  );
}

function smoothstep(from: number, to: number, x: number) {
  const progress = Math.max(0, Math.min(1, (x - from) / (to - from)));

  return progress * progress * (3 - 2 * progress);
}

/** Two gaussian beats per cycle, then rest. */
function heartbeat(time: number) {
  const phase = (time % HEART_MS) / HEART_MS;
  const lub = Math.exp(-(((phase - 0.16) / 0.055) ** 2));
  const dub = Math.exp(-(((phase - 0.34) / 0.07) ** 2));

  return lub + 0.55 * dub;
}

/** Each dot's color, from the faintest, drawn first, to the ember on top. */
const SHADES = ['faint', 'dim', 'bright', 'ember'] as const;
type Shade = (typeof SHADES)[number];
const SHADE_COLORS: Record<Shade, number[]> = { faint: DOT_FAINT, dim: DOT_DIM, bright: DOT_BRIGHT, ember: EMBER };

/** What one frame of the fresco is drawn with, in cells. */
type Frame = {
  beat: number;
  breath: number;
  sparkX: number;
  sparkY: number;
  coreRadius2: number;
  bloomRadius2: number;
  pointerX: number;
  pointerY: number;
  pointerRadius2: number;
  pointerEnergy: number;
  wave1: number;
  wave2: number;
};

function frameAt(
  time: number,
  cellsX: number,
  cellsY: number,
  pointer: { x: number; y: number; energy: number }
): Frame {
  const beat = heartbeat(time);
  const coreRadius = cellsX * 0.012 * (1 + 0.5 * beat);

  return {
    beat,
    breath: 1 + 0.04 * Math.sin(time * 0.0007),
    sparkX: SPARK.x * cellsX,
    sparkY: SPARK.y * cellsY,
    coreRadius2: coreRadius * coreRadius,
    bloomRadius2: (cellsX * 0.05) ** 2,
    pointerX: pointer.x * cellsX,
    pointerY: pointer.y * cellsY,
    pointerRadius2: (cellsX * 0.15) ** 2,
    pointerEnergy: pointer.energy,
    wave1: time * 0.00021,
    wave2: time * 0.00016,
  };
}

/** How far a cell is from the spark, squared, in a circle a little flattened. */
function sparkDistance2(x: number, y: number, frame: Frame) {
  const dx = x - frame.sparkX;
  const dy = (y - frame.sparkY) * 1.35;

  return dx * dx + dy * dy;
}

/** How bright a cell is in this frame, from how bright the fresco is there. */
function lightAt(fresco: number, x: number, y: number, spark: number, frame: Frame) {
  let light = fresco * frame.breath;

  // A shimmer in proportion: the dark stays dark, the skin breathes.
  light += light * 0.14 * Math.sin(x * 0.05 + frame.wave1 * 9 + Math.sin(y * 0.042 + frame.wave2 * 7));

  // The spark of life, kept small and beating.
  if (spark < frame.bloomRadius2) {
    light += (0.28 + 0.62 * frame.beat) * Math.exp(-spark / (frame.coreRadius2 * 5));
  }

  // The reader's presence, faint.
  if (frame.pointerEnergy > 0.02) {
    const dx = x - frame.pointerX;
    const dy = y - frame.pointerY;
    const pointer2 = dx * dx + dy * dy;
    if (pointer2 < frame.pointerRadius2) {
      light += 0.08 * frame.pointerEnergy * Math.exp(-pointer2 / (frame.pointerRadius2 * 0.35));
    }
  }

  return light;
}

function shadeOf(light: number, spark: number, frame: Frame): Shade {
  if (spark < frame.coreRadius2 * (2.2 + 1.6 * frame.beat)) {
    return 'ember';
  }

  if (light > 0.66) {
    return 'bright';
  }

  return light > 0.3 ? 'dim' : 'faint';
}

/** Draws the fresco on `canvas` and keeps it moving. Returns what stops it. */
function animateFresco(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): () => void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const image = new Image();
  const pointer = { x: -1, y: -1, energy: 0 };
  let cellsX = 0;
  let cellsY = 0;
  let dot = 3;
  let base: Float32Array | null = null;
  let running = false;
  let frameId = 0;
  let last = 0;

  const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    if (!image.naturalWidth || !canvas.parentElement) {
      return;
    }

    const cssWidth = canvas.parentElement.clientWidth;
    // The layout isn't ready yet.
    if (cssWidth < 16) {
      return;
    }

    const cssHeight = Math.round((cssWidth * image.naturalHeight) / image.naturalWidth);
    const ratio = pixelRatio();

    dot = cssWidth >= 720 ? 4 : 3;
    cellsX = Math.floor(cssWidth / dot);
    cellsY = Math.floor(cssHeight / dot);

    canvas.width = Math.round(cssWidth * ratio);
    canvas.height = Math.round(cssHeight * ratio);
    canvas.style.height = `${cssHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    // The fresco is sampled once per size. Warmth (skin) carries the light, and the cool plaster sky sinks
    // into the dark. A soft window dissolves the crop's edges, and the mantle and knee in the corners, to
    // black, so the hands float free.
    const sample = document.createElement('canvas');
    sample.width = cellsX;
    sample.height = cellsY;
    const sampleContext = sample.getContext('2d', { willReadFrequently: true });
    if (!sampleContext) {
      return;
    }

    sampleContext.drawImage(image, 0, 0, cellsX, cellsY);
    const data = sampleContext.getImageData(0, 0, cellsX, cellsY).data;

    base = new Float32Array(cellsX * cellsY);
    for (let y = 0; y < cellsY; y += 1) {
      const v = y / cellsY;
      for (let x = 0; x < cellsX; x += 1) {
        const u = x / cellsX;
        const index = y * cellsX + x;
        const red = data[index * 4];
        const green = data[index * 4 + 1];
        const blue = data[index * 4 + 2];

        const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
        const warmth = Math.max(0, Math.min(1, (red - blue) / 92));
        const value = Math.max(0, warmth * 0.95 + luminance * 0.14 - 0.1) ** 1.12;

        // Every edge fades to black.
        let mask = smoothstep(0, 0.08, u) * smoothstep(1, 0.94, u) * smoothstep(0, 0.14, v) * smoothstep(1, 0.82, v);
        // The mantle on the right, and Adam's knee at the bottom left, go quiet.
        mask *= 1 - 0.92 * smoothstep(0.86, 1, u);
        mask *= 1 - 0.9 * smoothstep(0.3, 0.06, u) * smoothstep(0.55, 0.95, v);

        base[index] = value * mask;
      }
    }
  }

  function drawBatch(batch: number[], color: number[]) {
    context.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    for (let index = 0; index < batch.length; index += 2) {
      context.fillRect(batch[index] * dot, batch[index + 1] * dot, dot - 1, dot - 1);
    }
  }

  function render(time: number) {
    if (!base) {
      return;
    }

    const ratio = pixelRatio();
    context.fillStyle = `rgb(${BG[0]}, ${BG[1]}, ${BG[2]})`;
    context.fillRect(0, 0, canvas.width / ratio, canvas.height / ratio);

    const frame = frameAt(time, cellsX, cellsY, pointer);
    const shades: Record<Shade, number[]> = { faint: [], dim: [], bright: [], ember: [] };

    for (let y = 0; y < cellsY; y += 1) {
      const row = BAYER[y & 7];
      for (let x = 0; x < cellsX; x += 1) {
        const spark = sparkDistance2(x, y, frame);
        const light = lightAt(base[y * cellsX + x], x, y, spark, frame);
        if (light > row[x & 7]) {
          shades[shadeOf(light, spark, frame)].push(x, y);
        }
      }
    }

    for (const shade of SHADES) {
      drawBatch(shades[shade], SHADE_COLORS[shade]);
    }
  }

  // 30 frames a second, whatever the display's rate.
  function loop(now: number) {
    frameId = requestAnimationFrame(loop);
    if (now - last < FRAME_MS) {
      return;
    }

    last = now;
    pointer.energy *= 0.95;
    render(now);
  }

  function start() {
    if (running || reduceMotion) {
      return;
    }

    running = true;
    frameId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frameId);
  }

  function handlePointerMove(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width;
    pointer.y = (event.clientY - rect.top) / rect.height;
    pointer.energy = 1;
  }

  function handleResize() {
    resize();
    if (!running) {
      render(performance.now());
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          start();
        } else {
          stop();
        }
      }
    },
    { threshold: 0.05 }
  );

  // The image can be ready before the first layout: wait for a real width.
  function init() {
    resize();
    if (!base) {
      frameId = requestAnimationFrame(init);

      return;
    }

    // Reduced motion holds the moment mid-beat.
    render(reduceMotion ? HEART_MS * 0.16 : performance.now());
    if (!reduceMotion) {
      observer.observe(canvas);
    }
  }

  canvas.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('resize', handleResize);
  image.onload = init;
  image.src = FRESCO_SRC;

  return () => {
    image.onload = null;
    stop();
    observer.disconnect();
    canvas.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('resize', handleResize);
  };
}
