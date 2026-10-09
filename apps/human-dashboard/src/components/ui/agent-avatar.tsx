import { MascotFace } from '@/components/ui/mascot-face';
import { cn } from '@/lib/utils';

/** `asleep` until the agent is set up, `idle` once it is. */
export type AgentAvatarMood = 'idle' | 'asleep';

type AgentAvatarProps = {
  mood?: AgentAvatarMood;
  /** Size and corners, such as `size-8 rounded-[9px]` in the sidebar or `size-14 rounded-full` on the Agent page. */
  className?: string;
};

/**
 * The agent's picture (`Mascot` in Figma, drawn on a 48px grid): the dithered orb on its dark red glow.
 * Awake, it turns towards the pointer and blinks. Both faces are always there, so one fades into the
 * other when the agent wakes up.
 */
export function AgentAvatar({ mood = 'idle', className }: AgentAvatarProps) {
  const face = 'absolute inset-0 size-full transition-opacity duration-300 ease-out motion-reduce:transition-none';

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block shrink-0 overflow-hidden bg-[radial-gradient(circle,#6b210d,#171412)]',
        // The outline sits on top of the picture, as in the design.
        'after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-border-strong/60 after:ring-inset',
        className
      )}
    >
      <MascotFace art="idle" still={mood !== 'idle'} className={cn(face, mood !== 'idle' && 'opacity-0')} />
      <MascotFace art="idle" mood="asleep" className={cn(face, mood !== 'asleep' && 'opacity-0')} />
    </span>
  );
}
