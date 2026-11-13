'use client';

import { useState } from 'react';

import { AgentMascot, useAgentLook } from '@/components/ui/agent-look';
import { glowOf } from '@/lib/look';
import { cn } from '@/lib/utils';

/** `asleep` until the agent is set up, `idle` once it is. */
export type AgentAvatarMood = 'idle' | 'asleep';

type AgentAvatarProps = {
  mood?: AgentAvatarMood;
  /** Stands still: no turning towards the pointer and no blinking. For a mascot that is part of a picture. */
  still?: boolean;
  /** The picture the operator gave the agent. It covers the mascot once it has loaded. */
  src?: string;
  /** Size and corners, such as `size-8 rounded-[9px]` in the sidebar or `size-14 rounded-full` on the Agent page. */
  className?: string;
};

/**
 * The agent's picture (`Mascot` in Figma, drawn on a 48px grid): the dithered orb on its dark red glow.
 * Awake, it turns towards the pointer and blinks. Both faces are always there, so one fades into the
 * other when the agent wakes up. An agent with a picture of its own shows that instead.
 *
 * Where the page says whose mascot this is (`AgentLookProvider`), it is that agent's look on a glow of its own
 * colour. Everywhere else it is Agent Inbox's own face, the orb as it always was.
 */
export function AgentAvatar({ mood = 'idle', still = false, src, className }: AgentAvatarProps) {
  const look = useAgentLook();
  // The address the picture loaded from: a new picture fades in again, and one that fails leaves the mascot.
  const [loaded, setLoaded] = useState<string>();
  const face = 'absolute inset-0 size-full transition-opacity duration-300 ease-out motion-reduce:transition-none';

  return (
    <span
      aria-hidden="true"
      style={look ? { backgroundImage: `radial-gradient(circle, ${glowOf(look.color)}, #171412)` } : undefined}
      className={cn(
        'relative block shrink-0 overflow-hidden bg-[radial-gradient(circle,#6b210d,#171412)]',
        // The outline sits on top of the picture, as in the design.
        'after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-border-strong/60 after:ring-inset',
        className
      )}
    >
      <AgentMascot art="idle" still={still || mood !== 'idle'} className={cn(face, mood !== 'idle' && 'opacity-0')} />
      <AgentMascot art="idle" mood="asleep" className={cn(face, mood !== 'asleep' && 'opacity-0')} />
      {src && (
        <img
          key={src}
          src={src}
          alt=""
          // A picture that was already in the cache has loaded before React could listen for it.
          ref={(image) => {
            if (image?.complete && image.naturalWidth > 0) {
              setLoaded(src);
            }
          }}
          onLoad={() => setLoaded(src)}
          className={cn(face, 'object-cover', loaded !== src && 'opacity-0')}
        />
      )}
    </span>
  );
}
