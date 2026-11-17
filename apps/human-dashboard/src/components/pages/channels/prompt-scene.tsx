import { ContactAvatar } from '@/app/(account)/(dashboard)/contacts/contact-avatar';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { CHANNELS, type ChannelId } from '@/data/channel-pages';
import type { PromptVisual } from '@/data/channel-prompt-visuals';
import { cn } from '@/lib/utils';

import { LandingMark } from './shared';

const mono = 'font-sapien-mono tracking-tight';
const bubbleText = 'text-[15px] leading-[21px] tracking-tight';
const time = cn(mono, 'text-[10px] leading-none text-sapien-foreground/40');

/**
 * The picture on a prompt card, drawn in code so it shows the page's channel and the message that prompt
 * sends. Same layout as the template's screenshots: channel and message-type tags, the agent's bubble, then
 * its buttons or the reply.
 */
export function PromptScene({
  channel,
  visual,
  number,
  agentLabel,
  className,
}: {
  channel: ChannelId;
  visual: PromptVisual;
  /** The card's position, shown as P-01. */
  number: number;
  /** The sender name in the agent's bubble, such as `claude-code`. */
  agentLabel: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={describe(channel, visual)}
      className={cn('relative flex min-h-72.5 flex-col overflow-hidden select-none', className)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(70%_100%_at_50%_0%,rgba(255,92,48,0.2)_0%,transparent_100%)]"
      />
      <div aria-hidden="true" className="relative flex items-center gap-1.5 px-5 pt-5">
        <span
          className={cn(
            mono,
            'flex h-6.5 items-center gap-2 rounded-md border border-sapien-surface bg-black px-2.5 text-[11px] leading-none text-sapien-foreground/70'
          )}
        >
          <LandingMark name={channel} size={13} />
          {CHANNELS[channel].name}
        </span>
        <span
          className={cn(
            mono,
            'flex h-6.5 items-center rounded-md border border-sapien-surface bg-black px-2.5 text-[11px] leading-none text-accent'
          )}
        >
          {visual.kind}
        </span>
        <span className={cn(mono, 'ml-auto text-[10px] text-sapien-foreground/20')}>
          P-{String(number).padStart(2, '0')}
        </span>
      </div>
      <div aria-hidden="true" className="relative flex flex-1 flex-col justify-center gap-2.5 px-5 pt-8 pb-6">
        <Scene visual={visual} agentLabel={agentLabel} />
      </div>
    </div>
  );
}

function Scene({ visual, agentLabel }: { visual: PromptVisual; agentLabel: string }) {
  switch (visual.kind) {
    case 'approve':
      return (
        <>
          <AgentBubble label={agentLabel} message={visual.message} />
          <Buttons options={['Approve', 'Deny']} picked={0} />
        </>
      );
    case 'choose':
      return (
        <>
          <AgentBubble label={agentLabel} message={visual.message} />
          <Buttons options={visual.options} picked={visual.picked} />
        </>
      );
    case 'ask':
      return (
        <>
          <AgentBubble label={agentLabel} message={visual.message} />
          <Reply message={visual.reply} seed={visual.from ?? 'you'} />
        </>
      );
    case 'tell':
      return <AgentBubble label={agentLabel} message={visual.message} />;
    case 'listen':
      return (
        <>
          <Reply message={visual.message} seed="you" />
          <AgentBubble label={agentLabel} message={visual.reply} />
        </>
      );
    case 'received':
      return <AgentBubble label={visual.from} message={visual.message} person />;
  }
}

function AgentBubble({ label, message, person = false }: { label: string; message: string; person?: boolean }) {
  return (
    <div className="flex items-end gap-3">
      {person ? (
        <ContactAvatar seed={label} className="size-7" />
      ) : (
        <AgentAvatar still className="size-7 rounded-full" />
      )}
      <div className="min-w-0 flex-1 rounded-[14px] bg-sapien-border px-3.5 py-3">
        <p className={cn(mono, 'text-[11px] leading-none', person ? 'text-sapien-foreground/50' : 'text-accent')}>
          {label}
        </p>
        <p className={cn(bubbleText, 'mt-2 text-sapien-foreground')}>{message}</p>
        <p className={cn(time, 'mt-1.5 text-right')}>just now</p>
      </div>
    </div>
  );
}

function Buttons({ options, picked }: { options: string[]; picked: number }) {
  return (
    <div className="grid gap-1.5 pl-10" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option, index) => (
        <span
          key={option}
          className={cn(
            'flex h-9 min-w-0 items-center justify-center truncate rounded-lg px-2 text-sm tracking-tight',
            index === picked ? 'bg-sapien-foreground text-black' : 'bg-sapien-surface text-sapien-foreground'
          )}
        >
          {option}
        </span>
      ))}
    </div>
  );
}

function Reply({ message, seed }: { message: string; seed: string }) {
  return (
    <div className="flex items-end justify-end gap-3">
      <div className="flex max-w-[80%] items-end gap-3 rounded-[14px] bg-sapien-foreground px-3.5 py-2.5 text-black">
        <p className={bubbleText}>{message}</p>
        <span className={cn(time, 'shrink-0 text-black/50')}>just now</span>
      </div>
      <ContactAvatar seed={seed} className="size-7" />
    </div>
  );
}

function describe(channel: ChannelId, visual: PromptVisual) {
  const where = CHANNELS[channel].name;
  switch (visual.kind) {
    case 'approve':
      return `${where} approval request: “${visual.message}” with Approve and Deny buttons.`;
    case 'choose':
      return `${where} choice: “${visual.message}” with the options ${visual.options.join(', ')}.`;
    case 'ask':
      return `${where} question: “${visual.message}” and the reply “${visual.reply}”.`;
    case 'tell':
      return `${where} update: “${visual.message}”.`;
    case 'listen':
      return `A ${where} message, “${visual.message}”, and the agent’s reply: “${visual.reply}”.`;
    case 'received':
      return `A ${where} message from ${visual.from}: “${visual.message}”.`;
  }
}
