import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import { cva, VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/utils/ui';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/10',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideCloseButton?: boolean;
  }
>(({ className, children, hideCloseButton = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-[50%]! top-[50%]! z-50 grid w-auto min-w-[320px] max-w-[calc(100vw-2rem)] translate-x-[-50%]! translate-y-[-50%]! gap-3 border p-4 shadow duration-200 sm:rounded-xl',
        className
      )}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close
          className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-foreground-alpha-600 transition-colors hover:bg-neutral-alpha-100 hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none"
          aria-label="Close"
        >
          <Cross2Icon className="h-4 w-4" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const footerVariants = cva(
  `-mx-4 -mb-4 mt-3 flex flex-col-reverse rounded-b-xl bg-bg-weak p-3 sm:flex-row sm:space-x-2 sm:justify-end border-t border-neutral-alpha-200`,
  {
    variants: {
      variant: {
        default: '',
        between: 'sm:justify-between',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type DialogFooterProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof footerVariants>;

const DialogFooter = ({ className, variant, ...props }: DialogFooterProps) => (
  <div className={footerVariants({ variant, className })} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base font-semibold leading-tight tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-foreground text-sm leading-snug', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
