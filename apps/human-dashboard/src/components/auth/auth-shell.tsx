import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { ChannelIcon } from '@/components/channels/channel-icon';
import { Brand } from '@/components/site/brand';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { cn } from '@/lib/utils';

/**
 * The split screen of sign-in and sign-up: the brand panel on the left, the form in the middle of the
 * right half. The panel needs room for its 620px illustration, so narrower screens get the form alone.
 *
 * Both halves sit in one column as wide as the design (1728px), centered on wider screens, so they stay
 * next to each other instead of drifting apart. The two halves are always the same width.
 *
 * The browser draws a page while its HTML is still coming in, and the form and the panel are centered in
 * their columns: every part that came in would push them up. So the screen stays hidden until its last
 * element (`data-shell-end`) is in, and then fades in whole. A page that arrives at once shows as before.
 */
type AuthShellProps = {
  /** Signing up from a claim link: the panel is about the agent that's waiting to be claimed. */
  claiming?: boolean;
  children: ReactNode;
};

export function AuthShell({ claiming = false, children }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh justify-center overflow-x-clip transition-[opacity,visibility] duration-200 ease-out motion-reduce:transition-none [&:not(:has(>[data-shell-end]))]:invisible [&:not(:has(>[data-shell-end]))]:opacity-0">
      <div className="flex w-full max-w-432">
        <BrandPanel claiming={claiming} />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="px-6 py-9 xl:hidden">
            <Brand className="w-fit" />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center px-4 pt-4 pb-16 xl:py-9">{children}</div>
        </main>
      </div>
      <span data-shell-end hidden />
    </div>
  );
}

function BrandPanel({ claiming }: { claiming: boolean }) {
  return (
    // On screens wider than the column, the panel's color carries on to the left edge of the screen.
    <aside className="relative hidden w-1/2 shrink-0 flex-col justify-between border-r border-border bg-subtle px-12 py-9 before:absolute before:inset-y-0 before:right-full before:w-screen before:bg-subtle xl:flex">
      <Brand className="w-fit" />
      <div className="flex flex-col items-center gap-5.5">
        {!claiming && <p className="font-mono text-[11px] leading-4 text-accent">the inbox API for agents</p>}
        <h2 className="text-center text-[30px] leading-9.5 tracking-[-0.75px] text-foreground">
          {claiming ? (
            <>
              Claim <em className="font-display text-accent">your agent’s</em> inbox
            </>
          ) : (
            <>
              Give your agent an inbox on <em className="font-display text-accent">every channel</em>
            </>
          )}
        </h2>
        <InboxFigure />
        <p className="flex items-center font-mono text-[11px] leading-4 whitespace-pre text-muted">
          {claiming ? (
            <>
              [ unclaimed <MonoArrow /> your account ]
            </>
          ) : (
            <>
              [ email · telegram · slack <MonoArrow /> inbox <MonoArrow /> your agent ]
            </>
          )}
        </p>
      </div>
      <a
        href="https://novu.co/"
        aria-label="Built on Novu"
        className="flex w-fit items-center gap-[10.8px] rounded-sm font-mono text-xs leading-4 font-medium tracking-[0.04em] text-secondary uppercase"
      >
        Built on
        <img src="/illustrations/novu-logo.svg" alt="" width={63} height={20} />
      </a>
    </aside>
  );
}

/** An arrow one mono letter wide. Drawn: the mono font's subset has none, and the fallback's is twice as wide. */
function MonoArrow() {
  return <ArrowRight aria-label="to" className="h-4 w-[1ch]" strokeWidth={1.5} />;
}

/** Messages from two channels arriving at the agent's address, and the agent's reply. Decoration only. */
function InboxFigure() {
  return (
    // Drawn at 620px. Where the panel is narrower than that, the whole figure is scaled down with it.
    <div aria-hidden="true" className="relative h-90 w-155 shrink-0 xl:[zoom:0.8] 2xl:[zoom:1]">
      <img src="/illustrations/hero-mailbox.svg" alt="" width={620} height={360} className="absolute inset-0" />
      <MessageCard
        icon={<ChannelIcon via="email" className="size-3 [&>svg]:size-1.5" />}
        label="Email · Stripe"
        time="09:12"
        className="top-[98.5px] left-[49px] w-50.5 rotate-2 [animation-delay:300ms]"
      >
        Your code is 482 913
      </MessageCard>
      <MessageCard
        icon={<ChannelIcon via="telegram" className="size-3 [&>svg]:size-[6.75px]" />}
        label="Telegram · Maya"
        time="10:02"
        className="top-[203.5px] left-[35px] w-50.5 -rotate-[1.5deg] [animation-delay:700ms]"
      >
        Can you send last month’s invoice?
      </MessageCard>
      <MessageCard
        reply
        icon={<AgentAvatar still className="size-3.5 rounded-full" />}
        label={
          <>
            Atlas <MonoArrow /> Maya
          </>
        }
        time="10:03"
        className="top-[160.5px] left-[391px] w-48.5 rotate-[1.5deg] [animation-delay:1300ms]"
      >
        Here it is. Invoice #2041 attached.
      </MessageCard>
      <p className="absolute top-86.5 left-[225.5px] flex items-center gap-1.5 rounded-sm border border-border-strong bg-subtle px-2 py-1 font-mono text-[11px] leading-3.5 text-default">
        <span className="size-1.5 rounded-full bg-success" />
        atlas@agentinbox.md
      </p>
    </div>
  );
}

type MessageCardProps = {
  /** The agent's own message: the light card. The others are messages that came in. */
  reply?: boolean;
  icon: ReactNode;
  label: ReactNode;
  time: string;
  className: string;
  children: ReactNode;
};

function MessageCard({ reply = false, icon, label, time, className, children }: MessageCardProps) {
  return (
    <div
      className={cn(
        // Slower than the usual rise: the messages come in one after another, and then the reply.
        'absolute flex animate-rise-in flex-col gap-1 rounded-lg px-3 py-2.5 shadow-[0_12px_28px_rgb(0_0_0/0.5)] [animation-duration:700ms] motion-reduce:animate-none',
        reply ? 'bg-[#e8e0d4]' : 'border border-border-strong bg-subtle',
        className
      )}
    >
      <div className="flex items-center gap-1.5 font-mono text-[10px] leading-3.5">
        {icon}
        <span className="flex items-center font-medium tracking-[0.3px] whitespace-pre text-accent uppercase [&>svg]:h-3.5 [&>svg]:stroke-2">
          {label}
        </span>
        <span className={cn('ml-auto', reply ? 'text-[#736b61]' : 'text-muted')}>{time}</span>
      </div>
      <p className={cn('text-xs leading-4.25', reply ? 'text-[#1f1a17]' : 'text-foreground')}>{children}</p>
    </div>
  );
}
