import Image from 'next/image';
import Link from 'next/link';
import type { DesignAsset } from '@/data/sapien-assets';

export function SiteBrand({ icon }: { icon: DesignAsset }) {
  return (
    // The logo opens the index page (the docs for agents).
    <Link href="/" aria-label="agentinbox" className="flex shrink-0 items-center gap-0.5 rounded-sm">
      <span className="flex size-8.5 items-center justify-center overflow-hidden rounded border border-sapien-border bg-black">
        <Image src={icon.src} width={icon.width} height={icon.height} alt="" className="-scale-x-100" />
      </span>
      <span className="flex h-8.5 w-27.5 items-center rounded bg-sapien-border pb-0.5 pl-3.5 font-sapien-mono text-sm leading-none tracking-tight">
        agentinbox
      </span>
    </Link>
  );
}
