import type { CSSProperties, ReactNode } from 'react';
import {
  useCasesAssets as assets,
  USE_CASES,
  USE_CASES_CAROUSEL,
  USE_CASES_CONVERSATION,
  USE_CASES_SECTION,
  type UseCase,
} from '@/data/sapien-use-cases';

import { cn } from '@/lib/utils';

import { Artwork } from './artwork';
import { ChannelChip } from './brand-logo';
import { CardCarousel } from './card-carousel';
import { MessageCard } from './message-card';
import { DisplayAccent, SectionEyebrow } from './section-eyebrow';
import { SectionFrame } from './section-frame';
import { UseCaseChat } from './use-case-chat';

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

function UseCaseCard({ useCase, index }: { useCase: UseCase; index: number }) {
  return (
    <article className="group/card flex w-full flex-col overflow-hidden rounded-2xl border border-sapien-border bg-[#0b0a09] transition-colors duration-300 hover:border-sapien-foreground/15 motion-reduce:transition-none">
      {/* The exchange itself, staged on a dot grid: what the agent does in this job. */}
      <div className="@container relative flex min-h-68 flex-1 flex-col gap-6 overflow-hidden border-b border-sapien-border px-5 pt-4 pb-7 md:px-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(rgba(238,229,216,0.07)_1px,transparent_1.2px)] bg-size-[12px_12px] [mask-image:radial-gradient(70%_70%_at_50%_55%,#000_20%,transparent_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute -top-1/2 left-1/2 h-full w-3/4 -translate-x-1/2 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,92,48,0.1)_0%,transparent_70%)] opacity-60 transition-opacity duration-500 group-hover/card:opacity-100 motion-reduce:transition-none"
        />
        {/* Where the exchange happens, like a chat app's title bar. */}
        <div className="relative flex items-start justify-between gap-3">
          <ul aria-label={USE_CASES_CAROUSEL.channels} className="flex flex-wrap gap-1.5">
            {useCase.channels.map((channel) => (
              <li key={channel}>
                <ChannelChip channel={channel} className="bg-[#0b0a09]" />
              </li>
            ))}
          </ul>
          <span
            aria-hidden="true"
            className="shrink-0 pt-2 font-sapien-pixel whitespace-nowrap text-[10px] leading-none tracking-[0.08em] text-sapien-foreground/30"
          >
            U-{String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <div className="relative my-auto">
          <UseCaseChat conversation={useCase.conversation} agentLabel={USE_CASES_CAROUSEL.agent} />
        </div>
      </div>
      <div className="px-5 pt-5 pb-6 md:px-6">
        <h3 className="text-[22px] leading-[1.15] font-normal tracking-[-0.03em]">{useCase.title}</h3>
        <p className="mt-2 min-h-[3lh] text-[15px] leading-[1.5] tracking-tight text-pretty text-sapien-foreground/50">
          {useCase.description}
        </p>
      </div>
    </article>
  );
}

export function UseCases() {
  return (
    <SectionFrame anchor="use-cases" className="px-4 pt-24 pb-4 md:px-8 md:pt-37 md:pb-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <SectionEyebrow index={USE_CASES_SECTION.index}>{USE_CASES_SECTION.label}</SectionEyebrow>
          <h2 className="mt-5 text-[34px] leading-[1.05] font-normal tracking-[-0.04em] md:text-[44px]">
            {/* Trailing margin widens the gap without indenting a wrapped line. */}
            <span className="mr-1 md:mr-2">{USE_CASES_SECTION.titleStart}</span>{' '}
            <span className="whitespace-nowrap">
              <DisplayAccent className="text-[42px] leading-none md:text-[56px]">
                {USE_CASES_SECTION.titleAccent}
              </DisplayAccent>
              <span
                aria-hidden="true"
                className="relative ml-2.5 inline-block h-[49px] w-[42px] align-[-12px] md:mr-px md:ml-[9px]"
              >
                <Artwork asset={assets.imgCursor} className="absolute top-[-5.75px] left-[-9px] h-[66.5px] w-[60px]" />
              </span>
            </span>
            <span className="block">{USE_CASES_SECTION.titleEnd}</span>
          </h2>
        </div>
        <p className="max-w-88 text-[17px] leading-[1.45] tracking-tight text-pretty text-sapien-foreground/50 lg:pb-2">
          {USE_CASES_SECTION.description}
        </p>
      </div>

      <CardCarousel
        label={USE_CASES_CAROUSEL.label}
        previousLabel={USE_CASES_CAROUSEL.previous}
        nextLabel={USE_CASES_CAROUSEL.next}
        ofLabel={USE_CASES_CAROUSEL.of}
        slides={USE_CASES.map((useCase, index) => <UseCaseCard key={useCase.title} useCase={useCase} index={index} />)}
        className="mt-12 md:mt-14"
      />

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
