import { cn } from '@/utils/ui';
import { HTMLAttributes } from 'react';

type InAppTabsSectionProps = HTMLAttributes<HTMLDivElement>;

export const InAppTabsSection = (props: InAppTabsSectionProps) => {
  const { className, ...rest } = props;
  return <div className={cn('px-3 py-5', className)} {...rest} />;
};
