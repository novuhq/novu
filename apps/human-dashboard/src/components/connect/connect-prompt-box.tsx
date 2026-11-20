'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { useSwap } from '@/hooks/use-swap';
import { cn } from '@/lib/utils';

/** How long the one-time code takes to fade out before the next one fades in. */
const SWAP_MS = 150;

/** A stretch of a command to show differently: the code, or what a public page leaves open. */
export type Slot = { text: string; render: (text: string) => ReactNode };

/** A stretch of text with each slot in it drawn its own way, such as the code, which fades in where the old one was. */
export function WithSlots({ text, slots }: { text: string; slots: Slot[] }): ReactNode {
  const found = slots
    .map((slot) => ({ slot, at: slot.text ? text.indexOf(slot.text) : -1 }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)[0];
  if (!found) {
    return <Words text={text} />;
  }

  const { slot, at } = found;

  return (
    <>
      <Words text={text.slice(0, at)} />
      {slot.render(slot.text)}
      <WithSlots text={text.slice(at + slot.text.length)} slots={slots} />
    </>
  );
}

/**
 * Text in which a flag (`--yes`, `--api-url=…`) moves to the next line whole rather than break at its hyphens:
 * lines break between words. One longer than a whole line (`--api-url=…` on a phone) wraps inside itself, so
 * it never runs past the box's edge.
 */
function Words({ text }: { text: string }) {
  return text.split(/(\s+)/).map((word, index) =>
    word.startsWith('-') ? (
      // The words never move, so where one stands is its key. The block keeps none of the line's hanging indent.
      <span key={index} className="inline-block max-w-full indent-0 [overflow-wrap:anywhere]">
        {word}
      </span>
    ) : (
      word
    )
  );
}

/** The one-time code in a command: a new one fades in where the last one was. */
export function SwappingCode({ code }: { code: string }) {
  const { shown, leaving } = useSwap(code, SWAP_MS);

  return (
    <span
      key={shown}
      className={cn(
        leaving
          ? 'opacity-0 transition-opacity duration-150 ease-in motion-reduce:transition-none'
          : 'animate-overlay-in motion-reduce:animate-none'
      )}
    >
      {shown}
    </span>
  );
}

/** Where the code goes on a public page: a link to sign in, which gets it. */
export function SignInSlot({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="rounded-sm text-accent underline decoration-accent/40 decoration-dashed underline-offset-4 transition-colors duration-150 hover:decoration-accent focus-visible:outline-offset-2 motion-reduce:transition-none"
    >
      sign in to get your code
    </Link>
  );
}
