import { type ReactNode, useId } from 'react';

type PanelProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
};

/** Headline block in the style of the gethuman.md call to action, with room for content below. */
export function Panel({ eyebrow, title, description, children }: PanelProps) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="mx-auto w-full max-w-120">
      <p className="font-mono text-sm tracking-tight text-foreground/50">{eyebrow}</p>
      <h1 id={titleId} className="mt-3 text-3xl leading-[1.125] tracking-[-0.04em] md:text-[40px]">
        {title}
      </h1>
      {description && (
        <p className="mt-3.5 text-[15px] leading-[1.375] tracking-tight text-foreground/70">{description}</p>
      )}
      {children && <div className="mt-8">{children}</div>}
    </section>
  );
}
