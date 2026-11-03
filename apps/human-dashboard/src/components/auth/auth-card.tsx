'use client';

import { type ReactNode, useEffect } from 'react';

import { useMeasuredHeight } from '@/hooks/use-measured-height';

/** Room around the content for focus rings, which the height animation would otherwise clip. */
const FOCUS_ROOM = 8;

/**
 * The height of the last content in that column. Going between sign-in and sign-up brings a new column, empty
 * until Clerk has drawn its form. Starting from this height, the form moves to its own as it does between
 * steps, instead of the column collapsing and growing back.
 */
let lastHeight = 0;

/**
 * The 380px column of the sign-in and sign-up screens. It stays centered on the screen, so its height is
 * animated: a new step or an error message moves the rest instead of making it jump. The first content of a
 * page load has nothing to move from, so it just appears.
 */
export function AuthFrame({ children }: { children: ReactNode }) {
  const { ref, height } = useMeasuredHeight();

  useEffect(() => {
    if (height) {
      lastHeight = height;
    }
  }, [height]);

  const shownHeight = height || lastHeight;

  return (
    <div
      style={shownHeight ? { height: shownHeight + FOCUS_ROOM * 2 } : undefined}
      className="-m-2 w-full max-w-99 overflow-hidden p-2 transition-[height] duration-300 ease-out motion-reduce:transition-none"
    >
      <div ref={ref}>{children}</div>
    </div>
  );
}

type AuthHeadingProps = {
  title: string;
  description: ReactNode;
};

/** A heading of ours in that column, in the type of Clerk's forms. */
export function AuthHeading({ title, description }: AuthHeadingProps) {
  return (
    <>
      <h1 className="text-2xl leading-7.5 tracking-[-0.48px] text-foreground">{title}</h1>
      <p className="text-[13px] leading-4.5 text-secondary">{description}</p>
    </>
  );
}

/** A screen of ours in that column. */
export function AuthCard({ title, description, children }: AuthHeadingProps & { children: ReactNode }) {
  return (
    <AuthFrame>
      <div className="flex animate-rise-in flex-col gap-4.5 motion-reduce:animate-none">
        <AuthHeading title={title} description={description} />
        {children}
      </div>
    </AuthFrame>
  );
}

/**
 * What holds the place of Clerk's form until it is drawn. That normally takes moments, and a line that flashes
 * by is worse than none, so it only shows on a slow connection. It takes no room, so the column keeps its
 * height and the form doesn't grow out of it.
 */
export function AuthFormPending() {
  return (
    <div className="absolute animate-rise-in [animation-delay:1s] motion-reduce:[animation-duration:1ms]">
      <AuthLoading />
    </div>
  );
}

/** The "Loading" line with the blinking cursor, while the browser is on its way somewhere. */
export function AuthLoading() {
  return (
    <output className="font-mono text-[13px] leading-4.5 text-secondary">
      Loading
      <span aria-hidden="true" className="ml-0.5 animate-terminal-cursor text-accent">
        ▍
      </span>
    </output>
  );
}
