'use client';

import { ContactAvatar } from '@/app/(account)/(dashboard)/contacts/contact-avatar';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { cn } from '@/lib/utils';

/**
 * A person on the marketing page, drawn with the dashboard's dithered contact portrait. The seed picks the
 * tint, so the same person looks the same wherever they appear.
 */
export function PersonFace({ seed, className }: { seed: string; className?: string }) {
  return <ContactAvatar seed={seed} className={className} />;
}

/**
 * The agent, drawn with the dashboard's dithered mascot. It blinks and turns towards the pointer, and stands
 * still for anyone who prefers reduced motion, which `MascotFace` already handles.
 */
export function AgentFace({ className }: { className?: string }) {
  return <AgentAvatar className={cn('rounded-full', className)} />;
}
