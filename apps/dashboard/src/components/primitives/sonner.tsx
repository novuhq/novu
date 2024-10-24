import { cva, VariantProps } from 'class-variance-authority';
import { useTheme } from 'next-themes';
import React from 'react';
import { IconBaseProps } from 'react-icons/lib';
import {
  RiAlertFill,
  RiCheckboxCircleFill,
  RiCloseLine,
  RiErrorWarningFill,
  RiInformationFill,
  RiProgress1Line,
} from 'react-icons/ri';
import { Toaster as Sonner } from 'sonner';
import { Button } from './button';
import { cn } from '@/utils/ui';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const toastVariants = cva(
  'text-foreground-950 text-sm border-neutral-alpha-200 flex items-start gap-1 border shadow-md bg-background',
  {
    variants: {
      variant: {
        default: 'rounded-lg p-2',
        md: 'rounded-lg px-2.5 py-2',
        lg: 'rounded-xl p-3.5',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type ToastProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof toastVariants>;

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(({ children, className, variant, ...props }, ref) => {
  return (
    <div ref={ref} className={toastVariants({ variant, className })} {...props}>
      {children}
    </div>
  );
});

const toastIconVariants = cva('min-w-5 size-5 p-[2px]', {
  variants: {
    variant: {
      default: 'fill-foreground-950',
      success: 'fill-success',
      error: 'fill-destructive',
      warning: 'fill-warning',
      info: 'fill-information',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type ToastIconProps = IconBaseProps & VariantProps<typeof toastIconVariants>;

const VARIANT_ICONS = {
  success: RiCheckboxCircleFill,
  info: RiInformationFill,
  warning: RiAlertFill,
  error: RiErrorWarningFill,
  default: RiProgress1Line,
};

const ToastIcon = ({ className, variant = 'default', ...props }: ToastIconProps) => {
  const Icon = VARIANT_ICONS[variant as keyof typeof VARIANT_ICONS];

  return <Icon className={toastIconVariants({ variant, className })} {...props} />;
};

const ToastClose = ({ className, ...props }: React.HTMLAttributes<HTMLButtonElement>) => {
  return (
    <Button variant="ghost" className={cn('h-min w-min rounded-sm p-0', className)} {...props}>
      <RiCloseLine className="fill-foreground-400 size-5" />
    </Button>
  );
};

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
        style: {
          height: 'initial',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, Toast, ToastIcon, ToastClose };
