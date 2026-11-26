import Image from 'next/image';
import Link from 'next/link';

import { LandingMark } from '@/components/pages/channels/shared';
import { CopyButton } from '@/components/sapien/copy-button';
import { SectionFrame } from '@/components/sapien/section-frame';
import { AGENTS, type AgentId, CHANNELS } from '@/data/channel-pages';
import { type ExampleMessage, USE_CASE_GROUPS } from '@/data/use-cases';
import { cn } from '@/lib/utils';

import { AgentLogoStack } from './agent-logo-stack';
import { UseCaseFilters } from './listing-filters';
import styles from './use-cases.module.css';

type UseCase = (typeof USE_CASE_GROUPS)[number]['cases'][number];

export function UseCaseListing() {
  return (
    <>
      <SectionFrame anchor="examples" className="px-4 pt-20 pb-10 text-center md:pt-30">
        <h2 className="text-[34px] leading-[1.125] tracking-[-0.04em] md:text-[40px]">Use cases</h2>
        <p className="mt-3 text-base leading-none tracking-tight text-sapien-foreground/50 md:text-lg">
          See what teams build with Agent Inbox.
        </p>
      </SectionFrame>
      <UseCaseFilters
        groups={USE_CASE_GROUPS.map(({ title, description, cases }, index) => ({
          title,
          description,
          shaded: index === 1,
          cases: cases.map((example) => ({
            id: example.id,
            label: example.label,
            content: <UseCaseRow example={example} />,
          })),
        }))}
      />
    </>
  );
}

function UseCaseRow({ example }: { example: UseCase }) {
  const heading = `${example.id}-heading`;
  return (
    <article
      id={example.id}
      aria-labelledby={heading}
      tabIndex={-1}
      className="section-rails grid scroll-mt-[67px] items-center gap-8 border-t border-sapien-border px-4 py-14 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent/70 md:grid-cols-[minmax(0,440fr)_minmax(0,406fr)] md:gap-x-8 md:px-8 md:py-20 lg:gap-x-12"
    >
      <div className="min-w-0 text-[14px] leading-[19px] tracking-tight text-sapien-foreground/60">
        <p className="font-sapien-mono text-[11px] leading-none text-accent">{example.label}</p>
        <h4 id={heading} className="mt-3 text-xl leading-[23px] tracking-[-0.035em] text-sapien-foreground">
          {example.title}
        </h4>
        <p className="mt-2">{example.intro}</p>
        <ul className="mt-5 space-y-2">
          {example.points.map((point) => (
            <li key={point} className="flex items-start gap-3.5 text-sapien-foreground/70">
              <span aria-hidden="true" className="mt-2 size-[5px] shrink-0 rounded-[1px] bg-sapien-foreground" />
              {point}
            </li>
          ))}
        </ul>
        <div className="mt-5 border-t border-sapien-border pt-4">
          <p className="font-sapien-mono text-[11px] leading-none text-sapien-foreground/50">Works with</p>
          <ul className="mt-2.5 flex flex-wrap gap-1">
            {(example.agents ?? ['any-agent']).map((id) => (
              <AgentChip key={id} id={id} />
            ))}
            {example.tools?.map((tool) => (
              <li key={tool} className={chipClass}>
                {tool}
              </li>
            ))}
          </ul>
        </div>
        <Link
          href={example.link.href}
          className="mt-4 inline-flex items-center gap-1.5 font-sapien-mono text-[13px] leading-[14px] text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {example.link.label}
          <Image src="/images/landing/arrow-up-right.svg" width={14} height={14} alt="" unoptimized />
        </Link>
      </div>
      <ExampleScene example={example} />
    </article>
  );
}

const chipClass =
  'flex min-h-7 items-center gap-1.5 rounded-md border border-sapien-surface bg-black/40 px-2 font-sapien-mono text-[11px] leading-none text-sapien-foreground/70';

function AgentChip({ id }: { id: AgentId }) {
  return (
    <li className={chipClass}>
      {id === 'any-agent' ? <AgentLogoStack /> : <LandingMark name={id} size={14} />}
      {AGENTS[id].name}
    </li>
  );
}

export function ExampleScene({ example, walkthrough = false }: { example: UseCase; walkthrough?: boolean }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-sapien-surface bg-black">
      {!walkthrough && (
        <div className="relative flex items-center border-b border-sapien-surface px-3.5 py-3">
          <span className={cn(chipClass, 'min-h-6.5 px-1.5')}>
            <LandingMark name={example.channel} size={14} />
            {CHANNELS[example.channel].name}
          </span>
        </div>
      )}
      <div
        className={cn(
          'flex flex-col gap-2.5 p-4.5',
          example.glow === 'right' && styles.glowRight,
          example.glow === 'center' && styles.glowCenter,
          !example.glow && styles.glowLeft
        )}
      >
        {example.incoming && <HumanBubble message={example.incoming} />}
        <div className="rounded-[14px] rounded-tl-sm bg-sapien-foreground px-3.5 py-3 text-black">
          <p className="font-sapien-mono text-[11px] leading-none tracking-tight text-[#ae3211]">
            {example.message.sender}
          </p>
          <p className="mt-2 text-[15px] leading-5 tracking-tight">{example.message.text}</p>
          {example.message.detail && (
            <p className="font-sapien-mono text-xs leading-4 tracking-tight text-black/60">{example.message.detail}</p>
          )}
          <p className="mt-2 text-right font-sapien-mono text-[11px] leading-none tracking-tight">
            {example.message.time}
          </p>
        </div>
        {example.options && (
          <ul className={cn('grid gap-1.5', example.id !== 'on-call' && 'grid-flow-col auto-cols-fr')}>
            {example.options.map((label) => (
              <li
                key={label}
                className={cn(
                  'grid min-h-8 place-items-center rounded-lg bg-sapien-surface px-1.5 py-1.5 text-center text-sm leading-4',
                  label === example.selected && 'bg-sapien-foreground font-medium text-black'
                )}
              >
                {label}
              </li>
            ))}
          </ul>
        )}
        {!walkthrough && example.status && (
          <p className="flex items-center gap-1.5 font-sapien-mono text-[11px] leading-4 tracking-tight text-sapien-foreground/50">
            <Image src="/images/use-cases/approval-check.svg" width={14} height={14} alt="" unoptimized />
            {example.status}
          </p>
        )}
        {example.reply && <HumanBubble message={example.reply} />}
      </div>
      {!walkthrough && (
        <div className="grid grid-cols-[1fr_auto] items-start gap-x-3 border-t border-sapien-surface bg-[#100f0d] p-4">
          <div className="flex min-w-0 items-start gap-2.5 font-sapien-mono text-xs leading-[18px] text-sapien-foreground/80">
            <span className="text-accent" aria-hidden="true">
              {example.prompt ? '›' : '$'}
            </span>
            <div className="min-w-0">
              <code className="block [overflow-wrap:anywhere]">
                {example.prompt ? `"${example.command}"` : example.command}
              </code>
              {example.note && <span className="block text-sapien-foreground/50">{example.note}</span>}
            </div>
          </div>
          <CopyButton
            text={example.command}
            variant="icon"
            className="grid size-5 place-items-center rounded text-sapien-foreground/50 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            {example.prompt ? 'Copy example prompt' : 'Copy example command'}
          </CopyButton>
        </div>
      )}
    </div>
  );
}

function HumanBubble({ message }: { message: ExampleMessage }) {
  return (
    <p className="max-w-[92%] self-end rounded-[14px] rounded-tr-sm bg-sapien-border px-3.5 py-2.5 text-[15px] leading-5 tracking-tight">
      {message.text}{' '}
      <span className="ml-1.5 whitespace-nowrap font-sapien-mono text-[10px] leading-none text-sapien-foreground/50">
        {message.time}
      </span>
    </p>
  );
}
