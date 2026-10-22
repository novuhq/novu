import type { CSSProperties, ReactNode } from 'react';
import { BUSINESS_CARD, CALL_CARD, heroAssets } from '@/data/sapien-hero';

import { cn } from '@/lib/utils';

import { Artwork } from './artwork';

/**
 * Card surfaces. Figma renders the hero cards with a frosted glass highlight that
 * its exports can't express, so "glass" is a gradient fitted to the 2x renders.
 * "flat" is the plain spec (overlay-blended white highlight over a 30% fill),
 * used by the scaled card in the closing section.
 */
const surfaces = {
  glass: {
    background:
      'radial-gradient(ellipse 71.23% 44.5% at 50% 11.71%, rgb(238 229 216 / 0.172) 20%, rgb(238 229 216 / 0.156) 30%, rgb(238 229 216 / 0.146) 40%, rgb(238 229 216 / 0.125) 50%, rgb(238 229 216 / 0.107) 60%, rgb(238 229 216 / 0.081) 70%, rgb(238 229 216 / 0.065) 80%, rgb(238 229 216 / 0.049) 90%, rgb(238 229 216 / 0.032) 100%, rgb(238 229 216 / 0.018) 110%, rgb(238 229 216 / 0.007) 120%, transparent 130%), #201d19',
  },
  flat: { backgroundColor: '#131210' },
} satisfies Record<string, CSSProperties>;

export type CardSurface = keyof typeof surfaces;

/** A 365px wide identity card face: surface, overlay-blended white stroke and content. */
export function CardFace({
  surface = 'glass',
  className,
  children,
}: {
  surface?: CardSurface;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('relative isolate w-[365px] overflow-hidden rounded-[19.062px]', className)}>
      {/* Surface and content share a layer so the hero's page-load intro can
          fade them in after the stroke and the cards behind. */}
      <div data-card-content="" className="h-full" style={surfaces[surface]}>
        {surface === 'flat' && (
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_203.73%_100%_at_50%_0,#fff_0%,transparent_43.205%)] mix-blend-overlay"
          />
        )}
        {children}
      </div>
      <span
        aria-hidden="true"
        data-card-stroke=""
        className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white mix-blend-overlay"
      />
    </div>
  );
}

export function CardHeader({ title, badge, outlined = false }: { title: string; badge: string; outlined?: boolean }) {
  return (
    <div className="relative flex h-11 items-start justify-between pt-4 pr-4 pl-5">
      <p className="mt-1 text-lg leading-none tracking-tight text-white">{title}</p>
      <p
        className={cn(
          'rounded-lg px-2.5 py-1.5 text-base leading-none tracking-tight text-accent',
          // Figma counts this stroke in the auto-layout size (90×30), so it overhangs the 44px header.
          outlined ? 'border border-accent/30' : 'bg-accent/20'
        )}
      >
        {badge}
      </p>
    </div>
  );
}

/** Figma's 1px rules are centred on a whole pixel, so they render as two half-bright rows. */
export function CardRule({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('block h-0.5 bg-sapien-foreground/5', className)} />;
}

/** Machine-readable-zone strip: two monospace lines between two rules. */
export function CardMrz({
  lines,
  ruleWidth,
  className,
  textClassName,
}: {
  lines: readonly [string, string];
  ruleWidth: string;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div className={cn('relative h-10', className)}>
      <CardRule className={cn('absolute -top-px left-0', ruleWidth)} />
      <p
        className={cn(
          'absolute top-2 left-0 font-mono text-[10px] leading-[1.2] whitespace-pre text-sapien-foreground',
          textClassName
        )}
      >
        {lines[0]}
        <br />
        {lines[1]}
      </p>
      <CardRule className={cn('absolute -bottom-px left-0', ruleWidth)} />
    </div>
  );
}

export function BusinessCard() {
  const card = BUSINESS_CARD;
  return (
    <CardFace className="h-[427px]">
      <CardHeader title={card.title} badge={card.status} />
      <div className="mt-4 flex items-center gap-2 pl-5">
        <Artwork asset={heroAssets.opsAgentAvatar} className="size-11 rounded-full" />
        <div className="flex flex-col gap-1">
          <p className="text-base leading-none tracking-tight text-sapien-foreground">{card.name}</p>
          <p className="text-[11px] leading-[1.2] tracking-[-0.01em] text-sapien-foreground/50">{card.role}</p>
        </div>
      </div>
      <div className="mt-4 ml-5 flex w-[330px] flex-col gap-3.5">
        <CardRule className="-my-px w-[325px]" />
        <dl className="flex flex-col gap-[13px]">
          {card.rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <dt className="text-base leading-[1.2] tracking-[-0.01em] text-sapien-foreground/50">{row.label}</dt>
              <dd className="flex items-center gap-1.5 text-base leading-none tracking-tight whitespace-pre text-sapien-foreground">
                {row.value}
                <Artwork asset={heroAssets.checkIcon} className="size-5" />
              </dd>
            </div>
          ))}
        </dl>
        <CardMrz lines={card.mrz} ruleWidth="w-[325px]" textClassName="tracking-[0.26em]" />
      </div>
    </CardFace>
  );
}

export function CallCard() {
  const card = CALL_CARD;
  return (
    <CardFace className="h-[386px]">
      <CardHeader title={card.title} badge={card.status} />
      <CardRule className="mt-[15px] ml-5 w-[325px]" />
      <div className="mt-[13px] flex gap-1 pl-5">
        <Artwork asset={heroAssets.salesAgentAvatar} className="size-15 rounded-2xl" />
        <Artwork asset={heroAssets.callWaveform} className="h-15 w-[261px]" />
      </div>
      <div className="mt-3 ml-[84px] flex w-[262px] flex-col gap-1.5">
        <p className="flex items-center gap-1 text-sm leading-none tracking-tight text-accent">
          <span aria-hidden="true" className="size-1 rounded-full bg-accent" />
          {card.callState}
        </p>
        <p className="relative h-5 text-xl leading-none">
          <span className="sr-only">{card.phone}</span>
          <Artwork
            asset={heroAssets.salesAgentPhone}
            className="absolute top-[-11.25px] left-[-11.25px] h-[42.5px] w-[189.5px]"
          />
        </p>
      </div>
      <p className="mt-3.5 ml-[84px] w-[261px] text-base leading-[1.25] tracking-tight whitespace-pre text-sapien-foreground">
        {card.quote.map((line, index) => (
          <span key={line.text} className={line.muted ? 'text-sapien-foreground/30' : undefined}>
            {index > 0 && <br />}
            {line.text}
          </span>
        ))}
      </p>
      <CardMrz
        lines={card.mrz}
        ruleWidth="w-[313.462px]"
        className="mt-[18px] ml-5 w-[326px]"
        textClassName="tracking-[0.2em]"
      />
    </CardFace>
  );
}
