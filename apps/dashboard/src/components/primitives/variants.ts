import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center h-5 border px-2 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        neutral: 'border-neutral-500 bg-neutral-500',
        feature: 'border-feature bg-feature',
        information: 'border-information bg-information',
        highlighted: 'border-highlighted bg-highlighted',
        stable: 'border-stable bg-stable',
        verified: 'border-verified bg-verified',
        destructive: 'border-destructive bg-destructive',
        'destructive-light': 'border-transparent bg-destructive/10',
        success: 'border-success bg-success',
        'success-light': 'border-transparent bg-success/10',
        warning: 'border-warning bg-warning',
        'warning-light': 'border-transparent bg-warning/10',
        alert: 'border-alert bg-alert',
        soft: 'border-neutral-alpha-200 bg-neutral-alpha-200',
      },
      kind: {
        default: 'rounded-md',
        pill: 'rounded-full',
        'pill-stroke': 'rounded-full bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      kind: 'default',
    },
  }
);

export const badgeContentVariants = cva('text-xs font-medium', {
  variants: {
    variant: {
      foreground: 'text-foreground',
      'neutral-foreground': 'text-neutral-foreground',
      neutral: 'text-neutral-500',
      feature: 'text-feature',
      information: 'text-information',
      highlighted: 'text-highlighted',
      stable: 'text-stable',
      verified: 'text-verified',
      destructive: 'text-destructive',
      success: 'text-success',
      warning: 'text-warning',
      alert: 'text-alert',
    },
  },
  defaultVariants: {
    variant: 'foreground',
  },
});

export const buttonVariants = cva(
  `relative isolate inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50`,
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-b from-neutral-alpha-900 to-neutral-900 text-neutral-foreground shadow-[inset_0_-4px_2px_-2px_hsl(var(--neutral-900)),inset_0_0_0_1px_rgba(255,255,255,0.16),0_0_0_1px_hsl(var(--neutral-900)),0px_1px_2px_0px_#0E121B3D] after:content-[""] after:absolute after:w-full after:h-full after:bg-gradient-to-b after:from-background/10 after:opacity-0 hover:after:opacity-100 after:rounded-lg after:transition-opacity after:duration-300',
        primary:
          'bg-gradient-to-b from-primary/90 to-primary text-primary-foreground shadow-[inset_0_-4px_2px_-2px_hsl(var(--primary)),inset_0_0_0_1px_rgba(255,255,255,0.16),0_0_0_1px_hsl(var(--primary)),0px_1px_2px_0px_#0E121B3D] after:content-[""] after:absolute after:w-full after:h-full after:bg-gradient-to-b after:from-background/10 after:opacity-0 hover:after:opacity-100 after:rounded-lg after:transition-opacity after:duration-300',
        destructive:
          'bg-gradient-to-b from-destructive/90 to-destructive text-destructive-foreground shadow-[inset_0_-4px_2px_-2px_hsl(var(--destructive)),inset_0_0_0_1px_rgba(255,255,255,0.16),0_0_0_1px_hsl(var(--destructive)),0px_1px_2px_0px_#0E121B3D] after:content-[""] after:absolute after:w-full after:h-full after:bg-gradient-to-b after:from-background/10 after:opacity-0 hover:after:opacity-100 after:rounded-lg after:transition-opacity after:duration-300',
        outline: 'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent',
        link: 'underline-offset-4 hover:underline',
        light:
          'bg-destructive/10 hover:bg-background hover:border hover:border-destructive text-destructive focus-visible:ring-destructive/10 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:bg-background focus-visible:border focus-visible:border-destructive',
      },
      size: {
        default: 'h-9 p-2.5',
        xs: 'h-6 px-1.5 rounded-md text-xs',
        sm: 'h-8 px-3 rounded-md text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'size-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export const stepVariants = cva(
  'inline-flex items-center shadow-xs rounded-full border text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-neutral-50',
  {
    variants: {
      variant: {
        // use solid bg here because we usually stack these on top of each other
        neutral: 'border-neutral-100 text-neutral-400',
        feature: 'border-feature/30 text-feature/30',
        information: 'border-information/30 text-information/30',
        highlighted: 'border-highlighted/30 text-highlighted/30',
        stable: 'border-stable/30 text-stable/30',
        verified: 'border-verified/30 text-verified/30',
        destructive: 'border-destructive/30 text-destructive/30',
        warning: 'border-warning/30 text-warning/30',
        alert: 'border-alert/30 text-alert/30',
      },
      size: {
        default: 'p-1 [&>svg]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'default',
    },
  }
);
