import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { DesignAsset } from '@/data/sapien-assets';

import { cn } from '@/lib/utils';

export function Artwork({
  asset,
  className,
  style,
}: {
  asset: DesignAsset;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Image
      src={asset.src}
      width={asset.width}
      height={asset.height}
      alt=""
      // Lossy optimization removes the original dithering and fine grain.
      unoptimized
      className={cn('pointer-events-none max-w-none', className)}
      style={style}
    />
  );
}
