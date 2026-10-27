import type { ReactNode } from 'react';
import type { DesignAsset } from '@/data/sapien-assets';

import { cn } from '@/lib/utils';

import { Artwork } from './artwork';

export function MessageCard({
  kind,
  icon,
  children,
  className,
}: {
  kind: 'agent' | 'human';
  icon: DesignAsset;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded px-1.5 pt-1.5 pb-2',
        kind === 'human' ? 'bg-sapien-foreground text-black' : 'bg-sapien-surface text-white',
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        <Artwork asset={icon} />
        <p
          className={`font-sapien-mono text-xs leading-none tracking-tight ${kind === 'human' ? 'text-[#b8320f]' : 'text-accent'}`}
        >
          {kind === 'agent' ? 'Agent' : 'Human'}
        </p>
      </div>
      <p className="mt-0.5 pl-5.5 text-sm leading-[1.2] font-medium tracking-[-0.01em]">{children}</p>
    </div>
  );
}
