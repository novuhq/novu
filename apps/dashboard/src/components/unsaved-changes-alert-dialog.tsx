import { Cross2Icon } from '@radix-ui/react-icons';
import { RiAlertFill } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/primitives/dialog';

type UnsavedChangesAlertDialogProps = {
  show?: boolean;
  description?: string;
  onCancel?: () => void;
  onProceed?: () => void;
  onExitComplete?: () => void;
};

export const UnsavedChangesAlertDialog = (props: UnsavedChangesAlertDialogProps) => {
  const { show, description, onCancel, onProceed, onExitComplete } = props;

  const handleAnimationEnd = (e: React.AnimationEvent) => {
    if (e.animationName.includes('exit') || e.animationName.includes('out')) {
      onExitComplete?.();
    }
  };

  return (
    <Dialog modal open={show} onOpenChange={(open) => !open && onCancel?.()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          className="max-w-[440px] gap-4 rounded-xl! p-4 overflow-hidden"
          hideCloseButton
          onAnimationEnd={handleAnimationEnd}
        >
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/10">
              <RiAlertFill className="size-6 text-warning" />
            </div>
            <DialogClose>
              <Cross2Icon className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          <div className="flex flex-col gap-1">
            <DialogTitle className="text-md font-medium tracking-normal">You might lose your progress</DialogTitle>
            <DialogDescription className="text-foreground-600">
              {description || 'This form has some unsaved changes. Save progress before you leave.'}
            </DialogDescription>
          </div>

          <DialogFooter>
            <DialogClose asChild aria-label="Close">
              <Button
                type="button"
                size="sm"
                mode="outline"
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCancel?.();
                }}
              >
                Cancel
              </Button>
            </DialogClose>

            <Button
              type="button"
              size="sm"
              variant="error"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onProceed?.();
              }}
            >
              Proceed anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};
