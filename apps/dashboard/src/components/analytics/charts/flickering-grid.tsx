"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AreaClipData = {
  total: number;
}[];

type FlickeringGridProps = {
  squareSize?: number;
  gridGap?: number;
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  maxOpacity?: number;
  minOpacity?: number;
  areaClip?: {
    data: AreaClipData;
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
  };
};

const DEFAULT_MARGIN = { top: 4, right: 2, bottom: 0, left: 2 };
const CLIP_SAFETY_PX = 1;
const OPACITY_LEVELS = 4;
const UPDATES_PER_FRAME = 2;
const UPDATE_EVERY_N_FRAMES = 16;
const TARGET_FPS = 24;
const BITS_16 = 0xffff;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
const ANIMATION_LEVEL_MIN = 1;
const ANIMATION_LEVEL_MAX = 2;

function getLineYAtPixel(
  px: number,
  w: number,
  h: number,
  data: AreaClipData,
  margin: { top: number; right: number; bottom: number; left: number }
): number {
  if (!data.length) return h;
  let maxTotal = 0;
  for (let i = 0; i < data.length; i++) {
    const t = data[i].total;
    if (t > maxTotal) maxTotal = t;
  }
  if (maxTotal === 0) maxTotal = 1;
  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;
  if (innerW <= 0 || innerH <= 0) return h;
  const dataIndex = Math.max(0, Math.min(((px - margin.left) / innerW) * (data.length - 1), data.length - 1));
  const i0 = Math.floor(dataIndex);
  const i1 = Math.min(i0 + 1, data.length - 1);
  const t = dataIndex - i0;
  const total = data[i0].total + t * (data[i1].total - data[i0].total);
  return margin.top + innerH * (1 - total / maxTotal);
}

const FLICKER_CHANCE = 0.04;

export function FlickeringGrid({
  squareSize = 0.8,
  gridGap = 4,
  color = "currentColor",
  width,
  height,
  className = "",
  maxOpacity = 0.18,
  minOpacity = 0.12,
  areaClip,
}: FlickeringGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const margin = useMemo(
    () => areaClip ? { ...DEFAULT_MARGIN, ...areaClip.margin } : null,
    [areaClip]
  );

  const clipDataSignature = useMemo(
    () =>
      areaClip?.data
        ? areaClip.data
            .map((d) => d.total)
            .join(",")
        : null,
    [areaClip?.data]
  );

  const getColorRgbaPrefix = useCallback(
    (containerElement: HTMLElement | null) => {
      if (typeof window === "undefined") return "rgba(128,128,128,";
      const colorToResolve =
        (containerElement && getComputedStyle(containerElement).color) || color;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "rgba(128,128,128,";
      ctx.fillStyle = colorToResolve;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
      return `rgba(${r},${g},${b},`;
    },
    [color]
  );

  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement, w: number, h: number) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const cols = Math.floor(w / (squareSize + gridGap));
      const rows = Math.floor(h / (squareSize + gridGap));
      const squares = new Uint8Array(cols * rows);
      for (let i = 0; i < squares.length; i++) {
        squares[i] = ANIMATION_LEVEL_MIN + Math.floor(Math.random() * (ANIMATION_LEVEL_MAX - ANIMATION_LEVEL_MIN + 1));
      }
      return { cols, rows, squares, dpr };
    },
    [squareSize, gridGap]
  );

  const updateSquares = useCallback(
    (squares: Uint8Array, visiblePacked: Uint32Array, rows: number) => {
      const len = visiblePacked.length;
      if (len === 0) return;
      const range = ANIMATION_LEVEL_MAX - ANIMATION_LEVEL_MIN + 1;
      for (let k = 0; k < UPDATES_PER_FRAME; k++) {
        if (Math.random() >= FLICKER_CHANCE) continue;
        const pick = (Math.random() * len) | 0;
        const pack = visiblePacked[pick];
        if (pack === undefined) continue;
        const idx = (pack >> 16) * rows + (pack & BITS_16);
        squares[idx] = ANIMATION_LEVEL_MIN + ((Math.random() * range) | 0);
      }
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const clipData = areaClip?.data;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rgbaPrefix = getColorRgbaPrefix(containerRef.current);
    const range = Math.max(0, maxOpacity - minOpacity);
    const fillStyles: string[] = [];
    for (let l = 0; l < OPACITY_LEVELS; l++) {
      const o = minOpacity + (range * (l + 0.5)) / OPACITY_LEVELS;
      fillStyles.push(`${rgbaPrefix}${o.toFixed(2)})`);
    }

    type GridParams = ReturnType<typeof setupCanvas> & {
      lineBoundary?: Float32Array;
      visiblePacked: Uint32Array;
    };
    let animationFrameId: number | undefined;
    let gridParams: GridParams | undefined;
    const marginVal = margin;
    let lastDrawTime = 0;
    let frameCount = 0;
    const updateMask = UPDATE_EVERY_N_FRAMES - 1;

    const animate = (time: number) => {
      if (!isInView || !gridParams) return;
      if (time - lastDrawTime < FRAME_INTERVAL_MS) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }
      lastDrawTime = time;
      frameCount += 1;
      if ((frameCount & updateMask) === 0) {
        updateSquares(gridParams.squares, gridParams.visiblePacked, gridParams.rows);
      }

      const sq = gridParams.squares;
      const vis = gridParams.visiblePacked;
      const r = gridParams.rows;
      const cw = (squareSize + gridGap) * gridParams.dpr;
      const ch = cw;
      const sz = squareSize * gridParams.dpr;
      const fill = fillStyles;
      const n = vis.length;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let curStyle = -1;
      for (let k = 0; k < n; k++) {
        const pack = vis[k];
        if (pack === undefined) continue;
        const i = pack >> 16;
        const j = pack & BITS_16;
        const idx = i * r + j;
        const level = sq[idx] ?? 0;
        if (level !== curStyle) {
          ctx.fillStyle = fill[level] ?? fill[0];
          curStyle = level;
        }
        ctx.fillRect(i * cw, j * ch, sz, sz);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const updateCanvasSize = () => {
      const newWidth = width ?? container.clientWidth;
      const newHeight = height ?? container.clientHeight;
      setCanvasSize({ width: newWidth, height: newHeight });
      const params = setupCanvas(canvas, newWidth, newHeight) as GridParams;
      const dpr = params.dpr;
      const cols = params.cols;
      const rows = params.rows;
      const cellH = (squareSize + gridGap) * dpr;
      const total = cols * rows;
      const packed: number[] = [];

      if (clipData && marginVal && newWidth > 0 && newHeight > 0) {
        const safetyCanvas = CLIP_SAFETY_PX * dpr;
        params.lineBoundary = new Float32Array(cols);
        for (let i = 0; i < cols; i++) {
          const pxCss = i * (squareSize + gridGap) + squareSize / 2;
          const lineYCss = getLineYAtPixel(pxCss, newWidth, newHeight, clipData, marginVal);
          params.lineBoundary[i] = lineYCss * dpr + safetyCanvas;
        }
        for (let i = 0; i < cols; i++) {
          const topBound = params.lineBoundary[i] ?? 0;
          for (let j = 0; j < rows; j++) {
            if (j * cellH >= topBound) packed.push((i << 16) | j);
          }
        }
      } else {
        for (let idx = 0; idx < total; idx++) {
          const i = (idx / rows) | 0;
          packed.push((i << 16) | (idx - i * rows));
        }
      }

      params.visiblePacked = new Uint32Array(packed);
      gridParams = params;
      lastDrawTime = performance.now();
      if (isInView) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0 }
    );
    intersectionObserver.observe(canvas);

    return () => {
      if (typeof animationFrameId === 'number') cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [
    setupCanvas,
    updateSquares,
    getColorRgbaPrefix,
    width,
    height,
    isInView,
    squareSize,
    gridGap,
    maxOpacity,
    minOpacity,
    clipDataSignature,
    margin,
  ]);

  return (
    <div
      ref={containerRef}
      className={`size-full ${className}`}
      style={{ color }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{ width: canvasSize.width, height: canvasSize.height }}
        aria-hidden
      />
    </div>
  );
}
