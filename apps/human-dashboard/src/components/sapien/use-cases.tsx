import type { CSSProperties, ReactNode } from 'react';
import {
  useCasesAssets as assets,
  USE_CASES,
  USE_CASES_CONVERSATION,
  USE_CASES_SECTION,
} from '@/data/sapien-use-cases';

import { cn } from '@/lib/utils';

import { Artwork } from './artwork';
import { MessageCard } from './message-card';
import { SectionFrame } from './section-frame';

// Blurred Figma ellipse (Ellipse 47587) that fades the illustration and its tint.
const fadeMask: CSSProperties = {
  maskImage: `url("${assets.imgImageGen.src}")`,
  WebkitMaskImage: `url("${assets.imgImageGen.src}")`,
  maskSize: '100% 100%',
  WebkitMaskSize: '100% 100%',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
};

// Figma's 896×328 illustration stage, scaled from the bottom-right corner on
// narrower panels. Each blend mode gets its own layer so it composites against
// the panel background instead of an isolated group.
function CharacterLayer({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute right-0 bottom-0 h-82 w-224 origin-bottom-right scale-55 md:scale-80 lg:scale-100',
        className
      )}
    >
      <div className="absolute top-[-72px] left-46 h-115 w-224" style={fadeMask}>
        {children}
      </div>
    </div>
  );
}

export function UseCases() {
  return (
    <SectionFrame anchor="use-cases" className="px-4 pt-24 pb-4 md:px-8 md:pt-37 md:pb-8">
      <h2 className="text-3xl leading-[1.125] tracking-[-0.04em] md:pt-1.25 md:text-4xl">
        {/* Trailing margin widens the gap without indenting a wrapped line. */}
        <span className="mr-1 md:mr-[9px]">{USE_CASES_SECTION.titleStart}</span>{' '}
        <span className="whitespace-nowrap">
          <em className="font-sapien-display text-[40px] leading-none tracking-tight text-accent md:text-5xl">
            {USE_CASES_SECTION.titleAccent}
          </em>
          <span
            aria-hidden="true"
            className="relative ml-2.5 inline-block h-[49px] w-[42px] align-[-12px] md:mr-px md:ml-[9px]"
          >
            <Artwork asset={assets.imgCursor} className="absolute top-[-5.75px] left-[-9px] h-[66.5px] w-[60px]" />
          </span>
        </span>{' '}
        {USE_CASES_SECTION.titleEnd}
      </h2>

      <ul className="mt-8 overflow-hidden rounded-xl border border-sapien-border md:mt-8.5">
        {USE_CASES.map((useCase) => (
          <li
            key={useCase.title}
            className="relative grid gap-3 border-sapien-border px-4 pt-5 pb-6 not-first:border-t even:bg-sapien-border/50 md:min-h-28 md:grid-cols-[254px_minmax(0,513px)] md:gap-0 md:pr-8 md:pb-5 md:pl-[33px] md:first:min-h-[111px] md:last:min-h-[111px]"
          >
            <span aria-hidden="true" className="absolute top-[19px] left-0 h-6 w-[3px] rounded-r-[1px] bg-accent" />
            <h3 className="text-2xl leading-none tracking-[-0.04em]">{useCase.title}</h3>
            <p className="text-base leading-[1.37] tracking-tight text-sapien-foreground/70 md:text-lg">
              {useCase.description}
            </p>
          </li>
        ))}
      </ul>

      {/* Opaque equivalent of border/50 on black: the blend layers need an
          opaque backdrop inside this isolated group. */}
      <div className="relative isolate mt-4 flex flex-col overflow-hidden rounded-[14px] bg-[color-mix(in_srgb,var(--color-sapien-border)_50%,black)] px-4 pt-6 pb-37.5 md:mt-8 md:block md:h-82 md:p-0">
        <CharacterLayer className="mix-blend-lighten">
          <Artwork asset={assets.imgImageGen1} className="absolute top-11.5 left-1.75 h-113 w-[771px] object-cover" />
        </CharacterLayer>
        <CharacterLayer className="mix-blend-multiply">
          <Artwork asset={assets.imgEllipse47594} className="absolute top-4.25 -left-29.5" />
        </CharacterLayer>

        <div className="relative z-10 w-60.25 max-w-full md:absolute md:top-32.5 md:left-16.75">
          <div aria-hidden="true" className="pointer-events-none">
            <Artwork asset={assets.imgLine} className="absolute top-[-947.25px] left-[10.75px] rotate-180" />
            <Artwork
              asset={assets.imgLine1}
              className="absolute top-[11px] left-[-401.5px] origin-top-left -rotate-90"
            />
          </div>
          <MessageCard kind="agent" icon={assets.imgFrame} className="relative">
            <span className="whitespace-pre-line">{USE_CASES_CONVERSATION.agent}</span>
          </MessageCard>
        </div>

        <MessageCard
          kind="human"
          icon={assets.imgFrame1}
          className="relative z-10 mt-3 w-50.75 max-w-full self-end md:absolute md:top-10.25 md:right-36.25 md:mt-0 lg:right-45.25"
        >
          {USE_CASES_CONVERSATION.human}
        </MessageCard>
      </div>
    </SectionFrame>
  );
}
