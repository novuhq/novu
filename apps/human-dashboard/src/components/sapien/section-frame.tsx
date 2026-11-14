import { cn } from '@/lib/utils';

import { SectionDivider } from './section-divider';

type SectionFrameProps = {
  /** The section's id, so a link can end in `#faq`. */
  anchor: string;
  className?: string;
  auditId?: string;
  children: React.ReactNode;
};
export function SectionFrame({ anchor, className, auditId, children }: SectionFrameProps) {
  return (
    <section
      id={anchor}
      data-prime-audit-id={auditId}
      data-prime-audit-section={auditId}
      data-prime-audit-kind={auditId ? 'section' : undefined}
      data-prime-audit-role={auditId ? 'section' : undefined}
      className={cn(
        'section-rails',
        auditId && 'mb-px gap-0 border-x border-transparent [--section-rail-border:1px]',
        className
      )}
    >
      {children}
      <SectionDivider />
    </section>
  );
}
