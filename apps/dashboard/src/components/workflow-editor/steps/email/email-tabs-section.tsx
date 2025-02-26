import { cn } from '@/utils/ui';
import { HTMLAttributes } from 'react';

type EmailTabsSectionProps = HTMLAttributes<HTMLDivElement>;

export const EmailTabsSection = (props: EmailTabsSectionProps) => {
  const { className, ...rest } = props;
  return <div className={cn('px-4 py-3', className)} {...rest} />;
};
