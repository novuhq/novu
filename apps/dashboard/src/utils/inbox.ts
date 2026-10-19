import { cva } from 'class-variance-authority';
import { cn } from './ui';

export const inboxButtonVariants = cva(
  cn(
    'inline-flex gap-4 items-center justify-center whitespace-nowrap text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 after:absolute after:content-[""] before:content-[""] before:absolute [&_svg]:pointer-events-none [&_svg]:shrink-0',
    `focus-visible:outline-hidden focus-visible:ring-2 focus-visible:rounded-md focus-visible:ring-ring focus-visible:ring-offset-2`
  ),
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-b from-20% from-primary-foreground/20 to-transparent bg-purple-500 text-primary-foreground shadow-[0_0_0_0.5px_hsl(var(--purple-600))] relative before:absolute before:inset-0 before:border before:border-primary-foreground/10 after:absolute after:inset-0 after:opacity-0 hover:after:opacity-100 after:transition-opacity after:bg-gradient-to-b after:from-primary-foreground/5 after:to-transparent',
        secondary:
          'bg-background text-foreground-950 shadow-[0_0_0_0.5px_oklch(from_#FFFFFF_max(0,calc(l*(1+-0.1)))_c_h)] relative before:absolute before:inset-0 before:border before:border-[oklch(from_#646464_l_c_h/0.1)] after:absolute after:inset-0 after:opacity-0 hover:after:opacity-100 after:transition-opacity after:bg-gradient-to-b after:from-[oklch(from_#646464_l_c_h/0.05)] after:to-transparent',
      },
      size: {
        default: 'px-2 py-1 rounded-lg focus-visible:rounded-lg before:rounded-lg after:rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
