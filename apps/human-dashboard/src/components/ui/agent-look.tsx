'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';

import type { MascotLook } from '@/lib/look';

import { type MascotArt, MascotFace } from './mascot-face';

const AgentLookContext = createContext<MascotLook | null>(null);

type AgentLookProviderProps = {
  /**
   * The look of the agent whose pages these are, or nothing while its mascots show as they always have: before
   * looks are on for its account, and where there is no agent yet.
   */
  look: MascotLook | null | undefined;
  children: ReactNode;
};

/**
 * Says whose mascots are drawn below it. Every agent mascot there (`AgentMascot`, `AgentAvatar`) takes this look,
 * so a page names its agent once instead of handing the look to each drawing. Outside of one, a mascot is
 * Agent Inbox's own face: the orange orb, as on the home page and before signing in.
 */
export function AgentLookProvider({ look, children }: AgentLookProviderProps) {
  const body = look?.shape;
  const color = look?.color;
  const value = useMemo(() => (body && color ? { shape: body, color } : null), [body, color]);

  return <AgentLookContext.Provider value={value}>{children}</AgentLookContext.Provider>;
}

/** The look the mascots here are drawn in, or `null` where they show as they always have. */
export function useAgentLook(): MascotLook | null {
  return useContext(AgentLookContext);
}

/** The two sizes an agent's mascot comes in outside its card: the small one of avatars, and the large one. */
export type AgentMascotArt = Extract<MascotArt, 'idle' | 'waiting'>;

/** The drawing of each size in an agent's look: the design's `Avatar v2`, small and at its full grid. */
const LOOK_ART: Record<AgentMascotArt, MascotArt> = { idle: 'swatch', waiting: 'avatar' };

type AgentMascotProps = {
  art: AgentMascotArt;
  mood?: 'awake' | 'happy' | 'asleep';
  /** Stands still: no turning towards the pointer and no blinking. */
  still?: boolean;
  className?: string;
};

/**
 * An agent's mascot outside its card: in the agent's look where the page has one (`AgentLookProvider`), drawn as
 * the card draws it, and otherwise the mascot as it always was.
 */
export function AgentMascot({ art, mood, still, className }: AgentMascotProps) {
  const look = useAgentLook();

  if (!look) {
    return <MascotFace art={art} mood={mood} still={still} className={className} />;
  }

  return <MascotFace art={LOOK_ART[art]} mood={mood} still={still} look={look} ahead className={className} />;
}
