import { scaleAssets as assets, SCALE_FEATURES, SCALE_HEADING, SCALE_LABEL } from '@/data/sapien-scale';

import { Artwork } from './artwork';
import { SectionFrame } from './section-frame';

export function Scale() {
  return (
    <SectionFrame anchor="scale">
      <div className="relative px-4 pt-24 pb-28 md:pt-46.75 md:pb-47.5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-px top-0 bottom-0 overflow-hidden">
          <Artwork
            asset={assets.grid}
            className="absolute top-[calc(50%-1.5px)] left-1/2 h-129.5 w-239.5 -translate-x-1/2 -translate-y-1/2"
          />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <p className="mb-4.5 flex items-center gap-2 font-mono text-xs leading-none tracking-tight text-accent">
            <span aria-hidden="true" className="size-1 rounded-[1px] bg-accent" />
            {SCALE_LABEL}
          </p>
          <h2 className="w-full max-w-195.5 bg-[radial-gradient(ellipse_67.054%_219.444%_at_50%_54.861%,#eee5d8_0%,transparent_91.193%)] bg-clip-text text-3xl leading-[1.125] tracking-[-0.04em] text-transparent sm:text-[40px] md:text-5xl">
            {`${SCALE_HEADING.lead} `}
            <span className="text-accent">{SCALE_HEADING.accent}</span>
            {/* A fixed box rather than spaces, so the line can wrap around the
                icon and text-spacing overrides cannot widen it. */}
            <span className="relative inline-block w-[1.4476em]">
              {'\u200b'}
              <Artwork
                asset={assets.imgIcon}
                className="absolute top-[calc(50%+0.073em)] left-[calc(50%+0.03em)] size-[0.8334em] -translate-x-1/2 -translate-y-1/2"
              />
            </span>
            {SCALE_HEADING.rest}
          </h2>
        </div>
      </div>
      <ul className="grid border-t border-border md:grid-cols-3">
        {SCALE_FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="flex flex-col gap-6 border-border px-5 pt-4.75 pb-5 not-first:border-t md:not-first:border-t-0 md:not-first:border-l md:not-first:pl-[19px]"
          >
            <Artwork asset={feature.icon} className="size-6" />
            <div className="text-lg leading-[23px] tracking-tight text-sapien-foreground/70 md:max-w-[259px]">
              <h3 className="inline text-sapien-foreground">{feature.title}</h3>{' '}
              <p className="inline">{feature.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </SectionFrame>
  );
}
