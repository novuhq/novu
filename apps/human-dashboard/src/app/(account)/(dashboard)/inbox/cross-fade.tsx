'use client';

import { Fragment, type ReactNode, useState } from 'react';

import { useSwap } from '@/hooks/use-swap';

/** How long what was there takes to fade out before what replaces it fades in. */
const SWAP_MS = 150;

const FADE_OUT = 'opacity-0 transition-opacity duration-150 ease-in motion-reduce:transition-none';
const FADE_IN = 'animate-overlay-in motion-reduce:animate-none';

type CrossFadeProps<Value> = {
  /** Which content this is. When it changes, the old content fades out in place and the new one fades in. */
  id: string;
  /** What `children` draws. While the old content fades out it is drawn from the value it had. */
  value: Value;
  /** Draws a value. `className` fades it: it goes on the outermost element drawn. */
  children: (value: Value, className: string | undefined) => ReactNode;
};

/**
 * Something on show that changes while it is looked at, such as a card that got its answer or a status
 * chip: the old one fades out where it is and the new one fades in. Nothing fades when it first shows.
 */
export function CrossFade<Value>({ id, value, children }: CrossFadeProps<Value>) {
  const { shown, leaving } = useSwap(id, SWAP_MS);

  // The value for what is on its way out, kept from before it changed.
  const [held, setHeld] = useState(value);
  if (!leaving && held !== value) {
    setHeld(value);
  }

  // Whether anything was swapped yet: what first shows comes in with whatever it is part of.
  const [first] = useState(id);
  const [swapped, setSwapped] = useState(false);
  if (!swapped && shown !== first) {
    setSwapped(true);
  }

  return (
    <Fragment key={shown}>
      {children(leaving ? held : value, leaving ? FADE_OUT : swapped || shown !== first ? FADE_IN : undefined)}
    </Fragment>
  );
}
