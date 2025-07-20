import { RiRouteFill, RiTranslate2 } from 'react-icons/ri';
import { cn } from '@/utils/ui';

export const TranslatedWorkflowIcon = ({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) => {
  return (
    <div className={cn('relative inline-block', className)} {...props}>
      <RiRouteFill className="text-feature size-4" />
      <RiTranslate2 className="text-feature bg-background absolute -right-1 -top-1 size-3 rounded-full" />
    </div>
  );
};
