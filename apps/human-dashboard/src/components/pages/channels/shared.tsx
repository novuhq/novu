import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { CopyButton } from '@/components/sapien/copy-button';
import { CopyCommand } from '@/components/sapien/copy-command';
import { DisplayAccent } from '@/components/sapien/section-eyebrow';
import { SiteFooter } from '@/components/sapien/site-footer';
import { SiteHeader } from '@/components/sapien/site-header';
import { AGENTS, type AgentId, CHANNELS, type ChannelId, setupCommand, setupPrompt } from '@/data/channel-pages';
import { NAVIGATION } from '@/data/sapien';
import { geistMono, inter, redaction } from '@/lib/sapien-fonts';
import { cn } from '@/lib/utils';

export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div
      data-prime-audit-id="canvas"
      data-prime-audit-section="canvas"
      data-prime-audit-kind="page"
      data-prime-audit-role="page"
      className={cn(
        inter.variable,
        redaction.variable,
        geistMono.variable,
        'sapien-page channel-landing-page min-h-dvh gap-0 overflow-x-clip bg-sapien-background font-sapien-sans text-sapien-foreground'
      )}
    >
      <div
        data-prime-audit-id="page"
        data-prime-audit-section="page"
        data-prime-audit-kind="page"
        data-prime-audit-role="page"
        className="mx-auto w-[calc(100%-20px)] max-w-240 bg-sapien-background gap-0 sm:w-[calc(100%-2rem)] [&>header]:mb-px"
      >
        <SiteHeader items={NAVIGATION} />
        <main>{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}

export function LandingHeading({
  lead,
  accent,
  description,
  inline = false,
  className,
  descriptionClassName,
}: {
  lead: string;
  accent: string;
  description?: string;
  inline?: boolean;
  descriptionClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-start justify-between gap-6 md:flex-row md:items-end', className)}>
      <h2
        aria-label={`${lead} ${accent}`}
        className={cn(
          'flex shrink-0 flex-col gap-2 text-[30px] leading-[1.125] tracking-[-0.04em] md:text-4xl md:leading-[41px]',
          inline && 'flex-row items-end'
        )}
      >
        <span>{lead}</span>
        <DisplayAccent
          className={cn(
            'block text-[44px] leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] md:h-[39px] md:text-[56px]',
            inline && 'md:h-9 md:text-[52px]'
          )}
        >
          {accent}
        </DisplayAccent>
      </h2>
      {description && (
        <p
          className={cn(
            'w-full max-w-88 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50',
            descriptionClassName
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

export function LandingActions({
  channel,
  agent,
  stacked = false,
}: {
  channel: ChannelId;
  agent?: AgentId;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-center',
        stacked && 'gap-3 sm:flex-col'
      )}
    >
      <CopyCommand
        command={setupCommand(channel)}
        label={`Copy ${CHANNELS[channel].name} setup command`}
        variant="icon"
        className={cn('min-w-0 w-full sm:w-94', stacked && 'sm:w-full')}
      />
      <div className={cn('shrink-0', stacked && 'w-full')}>
        <CopyButton
          text={setupPrompt(channel, agent)}
          showTextOnError
          className="flex h-10 w-full items-center justify-center rounded-lg bg-sapien-border px-6 text-[15px] font-medium tracking-tight hover:bg-sapien-surface"
        >
          Copy Prompt
        </CopyButton>
      </div>
    </div>
  );
}

export function LandingMark({ name, size = 24 }: { name: ChannelId | AgentId | string; size?: number }) {
  return (
    <Image
      src={`/images/landing/${name}.svg`}
      width={size}
      height={size}
      alt=""
      className="shrink-0 object-contain"
      unoptimized
    />
  );
}

export function Breadcrumbs({ channel, agent }: { channel: ChannelId; agent: AgentId }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="font-sapien-mono text-[13px] leading-none tracking-tight text-sapien-foreground/50"
    >
      <ol className="flex flex-wrap items-center gap-2.5">
        <li>
          <Link href="/" className="hover:text-sapien-foreground">
            Home
          </Link>
        </li>
        <li aria-hidden="true">›</li>
        <li>
          <Link href={`/${channel}`} className="hover:text-sapien-foreground">
            {CHANNELS[channel].name}
          </Link>
        </li>
        <li aria-hidden="true">›</li>
        <li aria-current="page" className="text-sapien-foreground">
          {AGENTS[agent].name}
        </li>
      </ol>
    </nav>
  );
}
