'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';

import { ART_COLUMNS, ART_DIM_OPACITY, ART_ROWS, artPathsOf, drawCardArt } from '@/lib/card-art';
import { type ArtKind, artColorOf, type LookColor } from '@/lib/look';
import { cn } from '@/lib/utils';

type CardArtProps = {
  kind: ArtKind;
  seed: number;
  color: LookColor;
  /** Fills a box of another shape by cropping the drawing, as the mini card's side does. Off: it fits the width. */
  fill?: boolean;
  className?: string;
};

/**
 * The dotted drawing across the top of an agent card (`Art · dim` under `Art · lit`), drawn as two paths of square
 * cells over the card's width. A new colour blends in; a new drawing fades in over the old one.
 */
export function CardArt({ kind, seed, color, fill = false, className }: CardArtProps) {
  const [red, green, blue] = artColorOf(color);
  const paint = `rgb(${red} ${green} ${blue})`;

  return (
    <div aria-hidden="true" className={cn('relative', className)}>
      <AnimatePresence initial={false}>
        <ArtCellsDrawing key={`${kind}:${seed}`} kind={kind} seed={seed} color={paint} slice={fill} />
      </AnimatePresence>
    </div>
  );
}

function ArtCellsDrawing({ kind, seed, color, slice }: { kind: ArtKind; seed: number; color: string; slice: boolean }) {
  const paths = useMemo(() => artPathsOf(drawCardArt(kind, seed)), [kind, seed]);

  return (
    <motion.svg
      viewBox={`0 0 ${ART_COLUMNS} ${ART_ROWS}`}
      preserveAspectRatio={slice ? 'xMidYMid slice' : 'xMidYMin meet'}
      className="absolute inset-0 size-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
    >
      <path d={paths.dim} fill={color} opacity={ART_DIM_OPACITY} className="transition-[fill] duration-500" />
      <path d={paths.lit} fill={color} className="transition-[fill] duration-500" />
    </motion.svg>
  );
}
