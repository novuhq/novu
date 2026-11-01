import { cn } from '@/lib/utils';

import { SectionDivider } from './section-divider';

type SectionFrameProps = {
  /** The section's id, so a link can end in `#faq`. */
  anchor: string;
  className?: string;
  children: React.ReactNode;
};
export function SectionFrame({ anchor, className, children }: SectionFrameProps) {
  return (
    <section id={anchor} className={cn('section-rails', className)}>
      {children}
      <SectionDivider />
    </section>
  );
}
