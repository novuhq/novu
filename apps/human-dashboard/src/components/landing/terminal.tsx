import type { ReactNode } from 'react';

/** A terminal on the landing page: a title bar, then the session, line by line. A line too long for it scrolls. */
export function Terminal({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  return (
    <figure
      aria-label={label}
      className="min-w-0 border border-foreground/18 bg-subtle font-mono text-[0.8rem] leading-[1.75] font-normal"
    >
      <div className="flex justify-between border-b border-foreground/9 px-4 py-2.5 text-[0.66rem] tracking-[0.06em] text-muted">
        <span>{title}</span>
        <span>tty</span>
      </div>
      <div className="overflow-x-auto px-4 pt-4.5 pb-5">{children}</div>
    </figure>
  );
}

/** One line of the session, as typed or printed. It never wraps: a long one scrolls. */
export function Line({ children = ' ' }: { children?: ReactNode }) {
  return <div className="whitespace-pre">{children}</div>;
}

/** What was typed after the prompt. */
export function Typed({ children }: { children?: ReactNode }) {
  return (
    <>
      <span className="text-accent">$</span> <span className="text-foreground">{children}</span>
    </>
  );
}

/** A quoted argument, dimmer than the command around it. */
export function Quoted({ children }: { children: ReactNode }) {
  return <span className="text-muted">{children}</span>;
}

/** Where the next command goes, blinking. */
export function Cursor() {
  return (
    <span className="inline-block h-3.5 w-1.75 animate-terminal-cursor bg-accent align-[-2px] motion-reduce:animate-none" />
  );
}
