/* eslint-disable max-len */

import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex gap-4 items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-alpha-900',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-alpha-800',
        icon: 'text-secondary-foreground-alpha-500 hover:bg-neutral-100',
        ghost: 'hover:bg-neutral-100',
        unstyled: '',
      },
      size: {
        none: '',
        icon: 'p-1',
        default: 'h-8 px-3',
        sm: 'h-7 rounded-md px-3',
        lg: 'h-10 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
