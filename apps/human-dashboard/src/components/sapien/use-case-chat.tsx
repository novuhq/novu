'use client';

import { useEffect, useRef, useState } from 'react';

import type { UseCaseMessage } from '@/data/sapien-use-cases';
import { cn } from '@/lib/utils';

import { AgentFace, PersonFace } from './person-face';

type Phase = 'hidden' | 'first' | 'typing' | 'done';

/** When each phase starts, after the card is in view. */
const PHASE_AT: [Phase, number][] = [
  ['first', 120],
  ['typing', 700],
  ['done', 1700],
];

/**
 * A use case's two-message exchange. It replays each time its card comes into view: the first message, the
 * other side typing, then the reply. Hidden messages keep their space, so the card never changes height, and
 * reduced motion shows the whole exchange at once.
 */
export function UseCaseChat({
  conversation,
  agentLabel,
}: {
  conversation: readonly UseCaseMessage[];
  agentLabel: string;
}) {
  const list = useRef<HTMLOListElement>(null);
  const [phase, setPhase] = useState<Phase>('done');

  useEffect(() => {
    const element = list.current;
    if (!element || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timers: number[] = [];
    const clear = () => {
      for (const timer of timers) clearTimeout(timer);
      timers = [];
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        clear();
        if (!entry?.isIntersecting) {
          setPhase('hidden');

          return;
        }
        timers = PHASE_AT.map(([next, at]) => window.setTimeout(() => setPhase(next), at));
      },
      { threshold: 0.6 }
    );
    observer.observe(element);

    return () => {
      clear();
      observer.disconnect();
    };
  }, []);

  return (
    <ol ref={list} className="relative flex flex-col gap-3">
      {conversation.map((message, index) => (
        <ChatMessage
          key={message.text}
          message={message}
          agentLabel={agentLabel}
          shown={index === 0 ? phase !== 'hidden' : phase === 'done'}
          typing={index > 0 && phase === 'typing'}
        />
      ))}
    </ol>
  );
}

const agentBubble = 'rounded-bl-md border border-sapien-surface bg-[#161412] text-sapien-foreground';
const humanBubble = 'rounded-br-md bg-sapien-foreground text-black';

function ChatMessage({
  message,
  agentLabel,
  shown,
  typing,
}: {
  message: UseCaseMessage;
  agentLabel: string;
  shown: boolean;
  typing: boolean;
}) {
  const fromAgent = message.from === 'agent';

  return (
    <li className={cn('relative flex items-end gap-2', fromAgent ? 'self-start' : 'flex-row-reverse self-end')}>
      <span
        className={cn(
          'size-6 shrink-0 overflow-hidden rounded-full transition-opacity duration-300 motion-reduce:transition-none',
          shown || typing ? 'opacity-100' : 'opacity-0'
        )}
      >
        {fromAgent ? <AgentFace className="size-6" /> : <PersonFace seed={message.from} className="size-6" />}
      </span>
      <div
        className={cn(
          'max-w-[min(17rem,calc(100cqw-3rem))] rounded-2xl px-3.5 pt-2.5 pb-3 transition-[opacity,translate,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          fromAgent ? cn(agentBubble, 'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]') : humanBubble,
          shown ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-2 opacity-0 blur-[2px]'
        )}
      >
        <p
          className={cn(
            'font-sapien-mono text-[11px] leading-none tracking-tight',
            fromAgent ? 'text-accent' : 'text-black/45'
          )}
        >
          {fromAgent ? agentLabel : message.from}
        </p>
        <p className="mt-1.5 text-[15px] leading-[1.35] tracking-[-0.01em] text-pretty">{message.text}</p>
      </div>
      <span
        aria-hidden="true"
        className={cn(
          'absolute bottom-0 flex h-8 items-center gap-1 rounded-2xl px-3 transition-opacity duration-200 motion-reduce:transition-none',
          fromAgent ? cn(agentBubble, 'left-8') : cn(humanBubble, 'right-8'),
          typing ? 'opacity-100' : 'opacity-0'
        )}
      >
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="size-1 animate-typing-dot rounded-full bg-current"
            style={{ animationDelay: `${dot * 150}ms` }}
          />
        ))}
      </span>
    </li>
  );
}
