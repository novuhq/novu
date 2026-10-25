import Image from 'next/image';
import { CUSTOMER_LOGOS } from '@/data/sapien';

function LogoRow({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-[28.8px] pr-[28.8px]">
      {CUSTOMER_LOGOS.map(({ name, asset }) => (
        <li key={name} className="flex h-8 w-36 shrink-0 items-center justify-center">
          <Image
            src={asset.src}
            width={asset.width}
            height={asset.height}
            alt={hidden ? '' : name}
            // The marquee moves logos into view without scrolling, so lazy
            // loading would leave gaps until each one is fetched.
            loading="eager"
            className="max-w-none"
          />
        </li>
      ))}
    </ul>
  );
}

export function LogoCloud() {
  return (
    <section aria-label="Customer logos" className="section-rails pt-[27px] pb-8.75">
      <div className="-mx-1 overflow-hidden mask-[linear-gradient(to_right,transparent,black_25%,black_75%,transparent)] opacity-40">
        <div className="-ml-90 flex w-max animate-logo-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
          <LogoRow />
          <LogoRow hidden />
        </div>
      </div>
    </section>
  );
}
