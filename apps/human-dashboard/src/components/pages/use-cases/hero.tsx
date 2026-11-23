import Image from 'next/image';
import Link from 'next/link';

import { LandingMark } from '@/components/pages/channels/shared';
import { CopyCommand } from '@/components/sapien/copy-command';
import { DisplayAccent, SectionEyebrow } from '@/components/sapien/section-eyebrow';
import { SectionFrame } from '@/components/sapien/section-frame';
import { CHANNELS } from '@/data/channel-pages';
import { SETUP_COMMAND } from '@/data/sapien';
import { INBOX_PATH } from '@/lib/inbox';
import { cn } from '@/lib/utils';

import styles from './use-cases.module.css';

export const getStartedClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg bg-accent px-6 text-[15px] font-medium tracking-tight text-black hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent';

const examples = ['ask', 'approve', 'choose', 'tell'];

export function UseCasesHero() {
  return (
    <SectionFrame anchor="hero" className="pt-16 md:pt-18">
      <div className="mx-auto flex max-w-136 flex-col items-center gap-6 px-4 text-center">
        <SectionEyebrow className="normal-case tracking-tight text-accent">Use cases</SectionEyebrow>
        <h1 className="text-[32px] leading-[1.125] tracking-[-0.04em] md:text-4xl">
          What agents do
          <DisplayAccent className="mt-1.5 block text-[46px] leading-none md:h-[39px] md:text-[56px] md:[text-box-edge:cap_alphabetic] md:[text-box-trim:trim-both]">
            with an inbox
          </DisplayAccent>
        </h1>
        <p className="text-[15px] leading-[21px] tracking-tight text-sapien-foreground/60">
          Your agent asks before it acts, hears back on email, Telegram or Slack, and picks up messages people send it.
          Here&apos;s how teams put that to work.
        </p>
        <div className="flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row sm:items-start">
          <CopyCommand command={SETUP_COMMAND} label="Setup command" variant="icon" className="text-left sm:w-75" />
          <Link href={INBOX_PATH} className={getStartedClass}>
            Get started
          </Link>
        </div>
      </div>
      <div className="mt-16 grid border-t border-sapien-border sm:grid-cols-2 md:mt-25 lg:grid-cols-[2fr_1fr_1fr]">
        <div className="relative flex min-h-55 flex-col items-start justify-between gap-10 overflow-hidden px-4 pt-5 pb-8 sm:col-span-2 md:px-8 lg:col-span-1 lg:min-h-[296px]">
          <div aria-hidden="true" className={styles.heroDither} />
          <ul className="relative flex flex-wrap gap-1.5">
            {examples.map((label) => (
              <li
                key={label}
                className={cn(
                  'rounded-md border border-sapien-raised bg-black px-2.5 py-1.5 font-sapien-mono text-[11px] leading-[10px] text-sapien-foreground/70',
                  label === 'approve' && 'border-sapien-foreground bg-sapien-foreground text-black'
                )}
              >
                {label}
              </li>
            ))}
          </ul>
          <p className="relative text-xl leading-[1.3] tracking-[-0.04em] text-sapien-foreground/90 md:text-2xl">
            <span className="box-decoration-clone bg-black px-1.5">An agent that can ask</span>
            <br />
            <span className="box-decoration-clone bg-black px-1.5">is an agent you can trust with more.</span>
          </p>
        </div>
        <div className="flex min-h-64 flex-col items-start justify-between gap-8 border-t border-sapien-border p-6 sm:border-r lg:border-t-0 lg:border-l lg:pb-8">
          <p className="text-base leading-[1.4] tracking-tight text-sapien-foreground/60">
            <span className="text-sapien-foreground">One inbox, three channels,</span> and a way for people to reach
            your agent too.
          </p>
          <ChannelStack />
        </div>
        <div className="relative min-h-64 overflow-hidden border-t border-sapien-border pt-6 px-6 lg:border-t-0 lg:px-8">
          <p className="relative text-base leading-[1.4] tracking-tight text-sapien-foreground/60">
            From a <span className="text-sapien-foreground">$240 refund</span> to a{' '}
            <span className="text-sapien-foreground">2 a.m. rollback</span>, these are the moments an agent needs a
            person.
          </p>
          <Pulse />
        </div>
      </div>
    </SectionFrame>
  );
}

function ChannelStack() {
  return (
    <ul className="grid h-[83px] w-full max-w-56 justify-items-center">
      {(['slack', 'telegram', 'email'] as const).map((channel, index) => (
        <li
          key={channel}
          className={cn(
            'col-start-1 row-start-1 flex h-9 items-start gap-2.5 rounded-lg border border-sapien-surface bg-black px-3 pt-1.5 font-sapien-mono text-[13px]',
            index === 0 && 'w-[calc(100%-32px)] text-sapien-foreground/50',
            index === 1 && 'mt-6 w-[calc(100%-16px)] text-sapien-foreground/70',
            index === 2 && 'mt-[47px] w-full items-center border-accent/40 pt-0 text-sapien-foreground/90'
          )}
        >
          <LandingMark name={channel} size={16} />
          {CHANNELS[channel].name}
          {index === 2 && (
            <Image
              src="/images/use-cases/hero-check.svg"
              width={18}
              height={18}
              alt=""
              className="ml-auto"
              unoptimized
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function Pulse() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 flex h-33 items-end justify-center"
    >
      <div className="absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(ellipse_at_bottom,rgba(255,92,48,0.21),transparent_73%)]" />
      <div className="relative mb-16 h-11 w-60">
        <Image
          src="/images/use-cases/hero-pulse.svg"
          alt=""
          width={413}
          height={46}
          className="absolute -left-20 max-w-none"
          unoptimized
        />
        {[
          { left: 'left-14', label: '$240' },
          { left: 'left-[161px]', label: '2 a.m.' },
        ].map(({ left, label }) => (
          <div key={label} className={cn('absolute h-11 w-9', left)}>
            <Image src="/images/use-cases/hero-peak.svg" alt="" width={36} height={46} unoptimized />
            <Image
              src="/images/use-cases/hero-dot.svg"
              alt=""
              width={22}
              height={22}
              className="absolute -top-2.5 left-[3px]"
              unoptimized
            />
            <span className="absolute -top-6 left-[14px] -translate-x-1/2 whitespace-nowrap font-sapien-mono text-[10px] text-sapien-foreground/60">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
