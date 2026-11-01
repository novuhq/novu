import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import {
  scaleAssets as assets,
  BOOK_DEMO_HREF,
  BOOK_DEMO_LABEL,
  OPEN_SOURCE,
  SCALE_CAPTION,
  SCALE_FEATURES,
  SCALE_HEADING,
  SCALE_INDEX,
  SCALE_LABEL,
  SECURITY_BADGES,
  SECURITY_BADGES_LABEL,
} from '@/data/sapien-scale';

import { GitHubIcon } from '../auth/auth-icons';
import { Artwork } from './artwork';
import { DisplayAccent, SectionEyebrow } from './section-eyebrow';
import { SectionFrame } from './section-frame';

export function Scale() {
  return (
    <SectionFrame anchor="scale">
      <div className="relative px-4 pt-24 pb-20 md:pt-32 md:pb-28">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-px top-0 bottom-0 overflow-hidden">
          <Artwork
            asset={assets.grid}
            className="absolute top-[calc(50%-1.5px)] left-1/2 h-129.5 w-239.5 -translate-x-1/2 -translate-y-1/2 opacity-80"
          />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <SectionEyebrow index={SCALE_INDEX}>{SCALE_LABEL}</SectionEyebrow>
          <h2 className="mt-5 w-full max-w-195.5 text-[34px] leading-[1.1] font-normal tracking-[-0.04em] text-sapien-foreground/60 sm:text-[40px] md:text-5xl">
            {`${SCALE_HEADING.lead} `}
            <DisplayAccent className="text-[1.15em] leading-none">{SCALE_HEADING.accent}</DisplayAccent>
            {/* A fixed box rather than spaces, so the line can wrap around the
                icon and text-spacing overrides cannot widen it. */}
            <span className="relative inline-block w-[1.4476em]">
              {'\u200b'}
              <Artwork
                asset={assets.imgIcon}
                className="absolute top-[calc(50%+0.073em)] left-[calc(50%+0.03em)] size-[0.8334em] -translate-x-1/2 -translate-y-1/2"
              />
            </span>
            <span className="text-sapien-foreground">{SCALE_HEADING.rest}</span>
          </h2>
          <p className="mt-6 max-w-120 text-[17px] leading-[1.45] tracking-tight text-pretty text-sapien-foreground/50">
            {`${SCALE_CAPTION.lead} `}
            <a href={SCALE_CAPTION.novu.href} className="text-accent underline-offset-4 hover:underline">
              {SCALE_CAPTION.novu.label}
            </a>
            , {SCALE_CAPTION.rest}
          </p>
          <a
            href={BOOK_DEMO_HREF}
            className="mt-8 flex h-10 items-center justify-center rounded-lg border border-sapien-surface bg-sapien-background px-6 text-[15px] leading-none font-medium tracking-tight text-white transition-colors duration-150 hover:bg-sapien-surface motion-reduce:transition-none"
          >
            {BOOK_DEMO_LABEL}
          </a>
        </div>
      </div>
      <ul className="grid border-t border-sapien-border md:grid-cols-3">
        {SCALE_FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="flex flex-col gap-6 border-sapien-border px-5 pt-5 pb-6 not-first:border-t md:px-6 md:not-first:border-t-0 md:not-first:border-l"
          >
            <Artwork asset={feature.icon} className="size-6" />
            <div className="text-[17px] leading-[1.4] tracking-tight text-sapien-foreground/55 md:max-w-[270px]">
              <h3 className="inline text-sapien-foreground">{feature.title}</h3>{' '}
              <p className="inline">{feature.description}</p>
            </div>
          </li>
        ))}
      </ul>
      {/* Certifications and the source, side by side: one row closes the section. */}
      <div className="grid border-t border-sapien-border md:grid-cols-2">
        <ul aria-label={SECURITY_BADGES_LABEL} className="grid grid-cols-4">
          {SECURITY_BADGES.map((badge) => (
            <li
              key={badge.id}
              className="flex h-32 items-center justify-center border-sapien-border not-first:border-l md:h-full md:min-h-44"
            >
              <Image
                src={badge.image.src}
                width={badge.image.width}
                height={badge.image.height}
                alt={badge.alt}
                unoptimized
                className="h-auto w-[70%] max-w-[76px] opacity-80"
              />
            </li>
          ))}
        </ul>
        <OpenSourceCell />
      </div>
    </SectionFrame>
  );
}

function OpenSourceCell() {
  return (
    <a
      href={OPEN_SOURCE.href}
      className="group relative flex flex-col gap-5 overflow-hidden border-t border-sapien-border px-5 pt-7 pb-16 transition-colors duration-150 hover:bg-sapien-border/40 motion-reduce:transition-none md:border-t-0 md:border-l md:px-8 md:pt-10 md:pb-16"
    >
      <StarGraph />
      <span className="relative flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg border border-sapien-border bg-sapien-background">
          <GitHubIcon className="size-5 text-sapien-foreground" />
        </span>
        <span className="text-2xl leading-none tracking-[-0.04em]">{OPEN_SOURCE.title}</span>
      </span>
      <span className="relative max-w-96 text-[17px] leading-[1.45] tracking-tight text-pretty text-sapien-foreground/55">
        {OPEN_SOURCE.description}
      </span>
      <span className="relative flex gap-8">
        {OPEN_SOURCE.stats.map((stat) => (
          <span key={stat.label} className="flex flex-col gap-1">
            <span className="text-xl leading-none tracking-[-0.03em] text-sapien-foreground">{stat.value}</span>
            <span className="font-sapien-mono text-[11px] leading-none tracking-tight text-sapien-foreground/40">
              {stat.label}
            </span>
          </span>
        ))}
      </span>
      <span className="relative mt-auto flex items-center gap-1.5 font-sapien-mono text-xs tracking-tight text-accent">
        {OPEN_SOURCE.link}
        <ArrowUpRight
          aria-hidden="true"
          className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
        />
      </span>
    </a>
  );
}

/** A rising line along the bottom of the cell. Decorative: it is not a chart of measured history. */
function StarGraph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 64"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full"
    >
      <defs>
        <linearGradient id="open-source-graph" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff5c30" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ff5c30" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 58C48 56 80 50 120 42C168 32 210 28 256 16C288 8 308 6 320 4V64H0Z" fill="url(#open-source-graph)" />
      <path
        d="M0 58C48 56 80 50 120 42C168 32 210 28 256 16C288 8 308 6 320 4"
        fill="none"
        stroke="#ff5c30"
        strokeOpacity="0.55"
        strokeWidth="1.25"
      />
    </svg>
  );
}
