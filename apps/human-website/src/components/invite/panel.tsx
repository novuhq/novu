import type { ReactNode } from 'react';
import { useId } from 'react';

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

type InactiveReason = 'expired' | 'declined' | 'invalid';

export function InactiveInvite({ reason, senderName }: { reason: InactiveReason; senderName?: string }) {
  switch (reason) {
    case 'declined':
      return (
        <Panel
          eyebrow="invitation"
          title={
            <>
              Invitation <em className="font-display tracking-tight text-accent">declined</em>
            </>
          }
          description={
            <>
              {senderName ? (
                <>
                  <span className="font-medium text-foreground">{senderName}</span> won&apos;t contact you through this
                  link.
                </>
              ) : (
                "You won't be contacted through this link."
              )}{' '}
              You can close this tab.
            </>
          }
        />
      );
    case 'expired':
      return (
        <Panel
          eyebrow="invitation"
          title={
            <>
              This invitation has <em className="font-display tracking-tight text-accent">expired</em>
            </>
          }
          description="Invitation links work for a limited time. Ask the person who invited you to send a new one."
        />
      );
    default:
      return (
        <Panel
          eyebrow="invitation"
          title={
            <>
              This link <em className="font-display tracking-tight text-accent">isn&apos;t valid</em>
            </>
          }
          description="It may be incomplete or already replaced. Ask the person who invited you to send a new one."
        />
      );
  }
}
