import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { AnimatePresence, motion } from 'motion/react';
import * as React from 'react';
import { RiCloseLine } from 'react-icons/ri';
import { cn } from '@/utils/ui';
import { CompactButton } from './button-compact';

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetContentBase = SheetPrimitive.Content;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/20',
      className
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  'fixed flex flex-col z-50 bg-background shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-xl',
        right:
          'inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-xl',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  }
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = 'right', className, children, ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
        <SheetPrimitive.Close className="absolute right-3.5 top-3.5" asChild>
          <CompactButton size="md" variant="ghost" icon={RiCloseLine} data-close-button>
            <span className="sr-only">Close</span>
          </CompactButton>
        </SheetPrimitive.Close>
        {children}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

interface NonModalSheetContentProps extends SheetContentProps {
  /** Mirrors the `open` prop of the parent `Sheet`, to drive the hand-rolled overlay. */
  open: boolean;
  onOverlayClick?: () => void;
}

/**
 * Content for a `<Sheet modal={false}>`.
 *
 * A sheet must be non-modal whenever it hosts a dropdown that portals outside the sheet's DOM
 * subtree — variable pickers, condition field and operator selects. A modal sheet sets
 * `pointer-events: none` on `document.body`, and those portaled layers never get it back, so they
 * render but cannot be hovered or clicked.
 *
 * Radix renders `Dialog.Overlay` for modal dialogs only, so the dimming overlay is hand-rolled
 * here. Dismissing on outside interaction is delegated to that overlay: the portaled dropdowns sit
 * above it and are therefore never mistaken for an outside click.
 */
const NonModalSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  NonModalSheetContentProps
>(({ side = 'right', className, children, open, onOverlayClick, ...props }, ref) => (
  <SheetPortal>
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onOverlayClick}
        />
      )}
    </AnimatePresence>
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
      onInteractOutside={(event) => event.preventDefault()}
    >
      <SheetPrimitive.Close className="absolute right-3.5 top-3.5" asChild>
        <CompactButton size="md" variant="ghost" icon={RiCloseLine} data-close-button>
          <span className="sr-only">Close</span>
        </CompactButton>
      </SheetPrimitive.Close>
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
));
NonModalSheetContent.displayName = 'NonModalSheetContent';

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 p-6 text-center sm:text-left', className)} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse px-6 py-3 sm:flex-row sm:justify-end', className)} {...props} />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn('text-foreground text-lg font-semibold', className)} {...props} />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn('text-foreground-400 text-xs', className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

const SheetMain = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('h-full overflow-auto p-6', className)} {...props} />
);
SheetMain.displayName = 'SheetMain';

export {
  NonModalSheetContent,
  Sheet,
  SheetClose,
  SheetContent,
  SheetContentBase,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetPortal,
  SheetTitle,
};
