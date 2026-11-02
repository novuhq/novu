import { User } from 'lucide-react';
import type { ReactNode } from 'react';

import { AgentAvatar } from '@/components/ui/agent-avatar';
import { useMeasuredHeight } from '@/hooks/use-measured-height';

type InviteCardProps = {
  /** Names the view inside. A new one fades in while the card moves to its height. */
  step: string;
  children: ReactNode;
};

/**
 * The one card of the page, 480px wide with everything inside 22px apart and the dithered glow in its
 * top right corner. Moving to another step keeps the card and animates it to the new height.
 */
export function InviteCard({ step, children }: InviteCardProps) {
  const { ref, height } = useMeasuredHeight();

  return (
    <div
      // The border is part of the height; the measured content isn't.
      style={height === undefined ? undefined : { height: height + 2 }}
      className="relative isolate w-full max-w-120 overflow-hidden rounded-xl border border-border bg-background transition-[height] duration-300 ease-out motion-reduce:transition-none"
    >
      {/* `Dither` from the design system, exported as it is: 480x320 against the card's top right corner. */}
      <img
        src="/illustrations/dither-corner.svg"
        alt=""
        width={480}
        height={320}
        className="pointer-events-none absolute top-0 right-0 -z-10 h-80 w-120 max-w-none animate-breathe select-none motion-reduce:animate-none"
      />
      <div ref={ref}>
        <div key={step} className="flex animate-rise-in flex-col gap-5.5 p-5 motion-reduce:animate-none sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

/** The title of a step or of a card that ends the invite. The list of apps and the goodbye use a larger one. */
export function StepTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-base leading-6 font-medium">{children}</h1>;
}

export function CardText({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-4.5 text-secondary">{children}</p>;
}

/** Who is asking: a person and their agent. An account owner who never gave a name isn't named. */
export function InviterLine({ name, agentPictureUrl }: { name?: string; agentPictureUrl?: string }) {
  return (
    <div className="flex h-8 items-center gap-2.5">
      <span aria-hidden="true" className="flex shrink-0 items-center">
        <span className="flex size-8 items-center justify-center rounded-full border border-border bg-raised text-secondary">
          <User className="size-4" />
        </span>
        <AgentAvatar src={agentPictureUrl} className="-ml-2.5 size-8 rounded-full ring-2 ring-background" />
      </span>
      <p className="text-[13px] leading-4.5 text-secondary">{name ? `${name} invited you` : "You've been invited"}</p>
    </div>
  );
}

export function WaitingLine({ children }: { children: ReactNode }) {
  return (
    <output className="flex items-center gap-2 text-xs leading-4 text-secondary">
      <span aria-hidden="true" className="flex size-4 items-center justify-center">
        <span className="size-2 animate-pulse rounded-full bg-accent shadow-[0_0_0_4px_rgb(242_173_64/0.45)] motion-reduce:animate-none" />
      </span>
      {children}
    </output>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md bg-accent/10 px-3 py-2 text-[13px] leading-4.5 text-foreground ring-1 ring-accent/40"
    >
      {children}
    </p>
  );
}
