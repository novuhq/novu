import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import { cn } from '../utils/classname';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

const BaseButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const baseClass =
      'mly-inline-flex mly-items-center mly-justify-center mly-rounded-md mly-text-sm mly-font-medium mly-ring-offset-white mly-transition-colors focus-visible:mly-outline-none focus-visible:mly-ring-2 focus-visible:mly-ring-gray-400 focus-visible:mly-ring-offset-2 focus-visible:mly-relative focus-visible:mly-z-10 disabled:mly-opacity-50 ';
    const variantClasses = {
      default: 'mly-bg-gray-900 mly-text-gray-50 hover:mly-bg-soft-gray',
      destructive: 'mly-bg-red-500 mly-text-gray-50 hover:mly-bg-red-500/90',
      outline: 'mly-border mly-border-gray-200 mly-bg-white hover:mly-bg-gray-100 hover:mly-text-gray-900',
      secondary: 'mly-bg-gray-100 mly-text-gray-900 hover:mly-bg-gray-100/80',
      ghost:
        'hover:mly-bg-soft-gray bg-transparent hover:mly-text-gray-900 data-[state=true]:mly-bg-soft-gray data-[state=true]:mly-text-gray-900',
      link: 'mly-text-gray-900 mly-underline-offset-4 hover:mly-underline',
    };
    const sizeClasses = {
      default: 'mly-h-10 mly-px-4 mly-py-2',
      sm: 'mly-h-9 mly-rounded-md mly-px-3',
      lg: 'mly-h-11 mly-rounded-md mly-px-8',
      icon: 'mly-h-10 mly-w-10',
    };

    const classes = cn('mly-editor', baseClass, variantClasses[variant], sizeClasses[size], className);

    return <Comp className={classes} ref={ref} {...props} />;
  }
);

BaseButton.displayName = 'BaseButton';

export { BaseButton };
