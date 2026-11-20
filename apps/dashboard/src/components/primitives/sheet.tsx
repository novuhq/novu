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
  hideCloseButton?: boolean;
  overlayClassName?: string;
  overlayTransition?: React.ComponentProps<typeof motion.div>['transition'];
}

type NonModalSheetProps = Omit<NonModalSheetContentProps, 'onOverlayClick'> & {
  onOpenChange: (open: boolean) => void;
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Invisible tab stop at the edge of a non-modal sheet. Not `aria-hidden`, because a focusable
 * `aria-hidden` element is itself an accessibility violation.
 */
const SheetFocusGuard = ({ onFocus }: { onFocus: () => void }) => (
  // biome-ignore lint/a11y/noStaticElementInteractions: a focus sentinel only exists to observe focus, so it must not be a real control
  <span
    data-sheet-focus-guard=""
    // biome-ignore lint/a11y/noNoninteractiveTabindex: the tab stop is the entire purpose of the sentinel
    tabIndex={0}
    onFocus={onFocus}
    style={{ outline: 'none', opacity: 0, position: 'fixed', pointerEvents: 'none' }}
  />
);

function focusSheetEdge(container: HTMLElement | null, edge: 'first' | 'last') {
  if (!container) {
    return;
  }

  const candidates = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('data-sheet-focus-guard') && element.getClientRects().length > 0
  );
  const target = edge === 'first' ? candidates.at(0) : candidates.at(-1);

  // Radix gives the content `tabIndex={-1}`, so an empty sheet still has somewhere to land.
  (target ?? container).focus();
}

function injectSheetFocusGuards(
  child: React.ReactElement<{ children?: React.ReactNode }>,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  return React.cloneElement(
    child,
    undefined,
    <>
      <SheetFocusGuard onFocus={() => focusSheetEdge(containerRef.current, 'last')} />
      {child.props.children}
      <SheetFocusGuard onFocus={() => focusSheetEdge(containerRef.current, 'first')} />
    </>
  );
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
 *
 * A non-modal sheet also gets no focus trap, so the guards below keep Tab from walking behind an
 * overlay that reads as modal. They deliberately do not use Radix's `FocusScope`: its
 * `focusScopesStack` is module-scoped, and `react-focus-scope` is duplicated across the Radix
 * packages here, so a scope added at this level could never be paused by a portaled `Select` and
 * would fight it for focus. Guards only fire at this sheet's own tab boundary, which leaves the
 * portaled dropdowns — driven by arrow keys, not Tab — free to manage their own focus.
 */
const NonModalSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  NonModalSheetContentProps
>(
  (
    {
      side = 'right',
      className,
      children,
      open,
      onOverlayClick,
      hideCloseButton = false,
      overlayClassName,
      overlayTransition,
      asChild,
      ...props
    },
    ref
  ) => {
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const setContentRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node;

        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const guardedChildren =
      asChild && React.isValidElement<{ children?: React.ReactNode }>(children)
        ? injectSheetFocusGuards(children, contentRef)
        : children;

    return (
      <SheetPortal>
        <AnimatePresence>
          {open && (
            <motion.div
              className={cn('fixed inset-0 z-50 bg-black/20', overlayClassName)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={overlayTransition ?? { duration: 0.2 }}
              onClick={onOverlayClick}
            />
          )}
        </AnimatePresence>
        <SheetPrimitive.Content
          ref={setContentRef}
          asChild={asChild}
          className={asChild ? className : cn(sheetVariants({ side }), className)}
          {...props}
          onInteractOutside={(event) => event.preventDefault()}
        >
          {asChild ? (
            guardedChildren
          ) : (
            <>
              <SheetFocusGuard onFocus={() => focusSheetEdge(contentRef.current, 'last')} />
              {!hideCloseButton && (
                <SheetPrimitive.Close className="absolute right-3.5 top-3.5" asChild>
                  <CompactButton size="md" variant="ghost" icon={RiCloseLine} data-close-button>
                    <span className="sr-only">Close</span>
                  </CompactButton>
                </SheetPrimitive.Close>
              )}
              {children}
              <SheetFocusGuard onFocus={() => focusSheetEdge(contentRef.current, 'first')} />
            </>
          )}
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  }
);
NonModalSheetContent.displayName = 'NonModalSheetContent';

/**
 * Owns `modal={false}`, the dimming overlay, outside-click dismiss, and the keyboard focus
 * boundary. Callers should not wrap this in another `<Sheet>`.
 */
const NonModalSheet = ({ open, onOpenChange, children, ...props }: NonModalSheetProps) => (
  <Sheet modal={false} open={open} onOpenChange={onOpenChange}>
    <NonModalSheetContent open={open} onOverlayClick={() => onOpenChange(false)} {...props}>
      {children}
    </NonModalSheetContent>
  </Sheet>
);
NonModalSheet.displayName = 'NonModalSheet';

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
  NonModalSheet,
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
