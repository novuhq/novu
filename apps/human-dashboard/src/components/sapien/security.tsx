import Image from 'next/image';
import {
  BOOK_DEMO_HREF,
  BOOK_DEMO_LABEL,
  SECURITY_BADGES,
  SECURITY_BADGES_LABEL,
  SECURITY_CAPTION,
  SECURITY_HEADING,
} from '@/data/sapien-security';

import { SectionFrame } from './section-frame';

const FILLER_CLASSES = 'w-4 shrink-0 bg-border shadow-[0px_4px_68px_0px_rgba(0,0,0,0.25)] md:w-8';

export function Security() {
  return (
    <SectionFrame anchor="security">
      {/* In Figma the caption starts 39px down and overhangs the button row by
          5px; the negative bottom margin keeps that overhang from growing the
          row (badges start at 304px) while longer wraps still push them down. */}
      <div className="grid gap-y-5 px-4 pt-16 pb-12 md:grid-cols-2 md:grid-rows-[minmax(35px,auto)_auto] md:gap-y-7 md:px-0 md:pt-37 md:pb-13.25">
        {/* The top margin emulates Figma's cap-height text-box trim (measured
            from `text-box: trim-both cap alphabetic`) in every browser, so the
            cap top lands where Figma's 35px trimmed box starts. The bottom
            margin keeps the mixed-font line box (~56px) inside that 35px row,
            which only grows when the heading wraps (e.g. user text spacing).
            Below md, whole-pixel margins keep the box an integer height. */}
        <h2 className="-mt-1.5 -mb-1.25 text-4xl leading-none tracking-[-0.04em] text-sapien-foreground md:col-start-1 md:row-start-1 md:-mt-[0.231em] md:-mb-[0.3em] md:pl-8 md:text-5xl md:leading-[1.12]">
          <em className="font-sapien-display tracking-tight text-accent">{`${SECURITY_HEADING.accent} `}</em>
          {SECURITY_HEADING.rest}
        </h2>
        <p className="max-w-109 text-lg leading-[23px] tracking-tight text-sapien-foreground/50 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-9.75 md:mr-8 md:-mb-1.25 md:self-start">
          <span className="text-sapien-foreground">{SECURITY_CAPTION.lead}</span>
          {SECURITY_CAPTION.lines.map((line, index) => (
            <span key={line}>
              {index > 0 && <br className="hidden lg:block" />} {line}
            </span>
          ))}
        </p>
        <a
          href={BOOK_DEMO_HREF}
          className="mt-2 flex h-10 w-full items-center justify-center rounded-lg border border-sapien-surface p-2 text-[15px] leading-none font-medium tracking-tight text-white transition-colors duration-150 hover:bg-sapien-surface motion-reduce:transition-none sm:w-80 md:col-start-1 md:row-start-2 md:mt-0 md:ml-8"
        >
          {BOOK_DEMO_LABEL}
        </a>
      </div>
      {/* Filler block | four badge cells (2×2 below md) | filler block. Each
          cell draws Figma's centred 1px stroke on a box grown by half a pixel,
          so neighbouring strokes coincide and the bottom one meets the
          section divider. Badges sit 40px down as in Figma (centring the 81px
          HIPAA export would land it on a half pixel). */}
      <div className="flex">
        <span aria-hidden="true" className={FILLER_CLASSES} />
        <ul aria-label={SECURITY_BADGES_LABEL} className="grid min-w-0 flex-1 grid-cols-2 md:grid-cols-4">
          {SECURITY_BADGES.map((badge) => (
            <li
              key={badge.id}
              className="relative flex h-32 items-start justify-center pt-6 before:pointer-events-none before:absolute before:-inset-[0.5px] before:border before:border-border md:h-40 md:pt-10"
            >
              <Image
                src={badge.image.src}
                width={badge.image.width}
                height={badge.image.height}
                alt={badge.alt}
                unoptimized
                className="max-w-none"
              />
            </li>
          ))}
        </ul>
        <span aria-hidden="true" className={FILLER_CLASSES} />
      </div>
    </SectionFrame>
  );
}
