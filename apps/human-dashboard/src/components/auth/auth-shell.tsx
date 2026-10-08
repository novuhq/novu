import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Logomark } from './auth-icons';

/**
 * The split screen of sign-in and sign-up: the brand panel on the left, the form in the middle of the
 * right half. The panel needs room for its 620px illustration, so narrower screens get the form alone.
 *
 * Both halves sit in one column as wide as the design (1728px), centered on wider screens, so they stay
 * next to each other instead of drifting apart. The two halves are always the same width.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center overflow-x-clip">
      <div className="flex w-full max-w-432">
        <BrandPanel />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="px-6 py-9 xl:hidden">
            <Logo />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center px-4 pt-4 pb-16 xl:py-9">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <Link href="/" aria-label="human.md" className="flex w-fit items-center gap-2.5 rounded-sm">
      <Logomark className="size-5.5" />
      <span className="font-mono text-[15px] leading-5 tracking-[-0.3px] text-foreground">human.md</span>
    </Link>
  );
}

function BrandPanel() {
  return (
    // On screens wider than the column, the panel's color carries on to the left edge of the screen.
    <aside className="relative hidden w-1/2 shrink-0 flex-col justify-between border-r border-border bg-subtle px-12 py-9 before:absolute before:inset-y-0 before:right-full before:w-screen before:bg-subtle xl:flex">
      <Logo />
      <div className="flex flex-col items-center gap-5.5">
        <p className="font-mono text-[11px] leading-4 text-accent">the human API for agents</p>
        <h2 className="text-center text-[30px] leading-9.5 tracking-[-0.75px] text-foreground">
          Your agents can reach everything <em className="font-display text-accent">except you</em>
        </h2>
        <ConversationFigure />
        <p className="flex items-center font-mono text-[11px] leading-4 whitespace-pre text-muted">
          [ agent <MonoArrow /> decision request <MonoArrow /> human ]
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

/** The agent asking and the human answering, over the dithered picture of the two. Decoration only. */
function ConversationFigure() {
  return (
    // Drawn at 620px. Where the panel is narrower than that, the whole figure is scaled down with it.
    <div aria-hidden="true" className="relative h-90 w-155 shrink-0 xl:[zoom:0.8] 2xl:[zoom:1]">
      <img src="/illustrations/hero-agent-human.svg" alt="" width={620} height={360} className="absolute inset-0" />
      <ChatBubble
        from="Agent"
        avatar={{ src: '/illustrations/avatar-agent.svg', width: 12 }}
        className="top-17.5 left-[0.5px] w-67.25 border border-border bg-raised text-foreground [animation-delay:300ms]"
      >
        The next step needs your decision.
        <br />
        Should I continue?
      </ChatBubble>
      <ChatBubble
        from="Human"
        avatar={{ src: '/illustrations/avatar-human.svg', width: 10.15 }}
        className="top-47.5 left-97.5 w-55 bg-foreground text-background [animation-delay:1200ms]"
      >
        Approved! Keep going.
      </ChatBubble>
    </div>
  );
}

type ChatBubbleProps = {
  from: string;
  avatar: { src: string; width: number };
  className: string;
  children: ReactNode;
};

function ChatBubble({ from, avatar, className, children }: ChatBubbleProps) {
  return (
    <div
      className={cn(
        // Slower than the usual rise: the two take their turns, like a question and its answer.
        'absolute flex animate-rise-in flex-col gap-1 rounded-md px-3 py-2.5 shadow-[0_8px_24px_rgb(0_0_0/0.35)] [animation-duration:700ms] motion-reduce:animate-none',
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        <img src={avatar.src} alt="" width={avatar.width} height={12} className="h-3" />
        <span className="font-mono text-[11px] leading-4 text-accent">{from}</span>
      </div>
      <p className="text-[13px] leading-4.5">{children}</p>
    </div>
  );
}
