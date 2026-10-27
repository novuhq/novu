import type { ComponentPropsWithRef } from 'react';
import { RiQuestionFill } from 'react-icons/ri';
import { cn } from '@/utils/ui';
import { HeaderButton } from './header-button';

type HelpIconButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'>;

export function HelpIconButton({ className, ...rest }: HelpIconButtonProps) {
  return (
    <button type="button" tabIndex={-1} className={cn('flex items-center justify-center', className)} {...rest}>
      <HeaderButton label="Help">
        <RiQuestionFill className="text-foreground-600 size-4" />
      </HeaderButton>
    </button>
  );
}
