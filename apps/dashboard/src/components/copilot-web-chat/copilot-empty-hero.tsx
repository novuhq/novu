import { BroomSparkle } from '@/components/icons/broom-sparkle';
import { cn } from '@/utils/ui';
import { COPILOT_RAISED_SURFACE_SHADOW } from './copilot-web-chat-utils';

/** A faint 24px grid and glow behind the icon tile, fading out from the middle. */
function EmptyHeroBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-[60px] h-[300px] overflow-hidden opacity-40 [mask-image:radial-gradient(closest-side,black,rgb(0_0_0/0.4)_55%,transparent)]"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--stroke-soft))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--stroke-soft))_1px,transparent_1px)] bg-[size:24px_24px] bg-[position:12px_12px] opacity-20" />
      <div className="absolute left-1/2 top-10 h-40 w-[220px] -translate-x-1/2 rounded-full bg-feature-base opacity-[0.03] blur-[30px]" />
    </div>
  );
}

/** The Copilot's empty-state hero: the icon tile over the grid, a title and one line. */
export function CopilotEmptyHero({ title, body }: { title: string; body: string }) {
  return (
    <div className="relative flex flex-col items-center gap-3 px-4 pb-5 pt-10 text-center">
      <EmptyHeroBackdrop />
      <div
        className={cn(
          'relative flex size-11 items-center justify-center rounded-xl bg-bg-white',
          COPILOT_RAISED_SURFACE_SHADOW
        )}
      >
        <BroomSparkle className="size-[22px]" />
      </div>
      <div className="relative flex w-full flex-col gap-1">
        <div className="text-label-md text-text-strong">{title}</div>
        <p className="text-label-xs text-text-soft">{body}</p>
      </div>
    </div>
  );
}
