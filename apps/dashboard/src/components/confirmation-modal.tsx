import { Cross2Icon } from '@radix-ui/react-icons';
import { ReactNode } from 'react';
import { IconType } from 'react-icons';
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

type ConfirmationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmButtonText: string;
  confirmTrailingIcon?: IconType;
  isLoading?: boolean;
  isConfirmDisabled?: boolean;
  confirmButtonVariant?: 'primary' | 'error';
};

export const ConfirmationModal = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmButtonText,
  confirmTrailingIcon,
  isLoading,
  isConfirmDisabled,
  confirmButtonVariant = 'primary',
}: ConfirmationModalProps) => {
  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-[440px] gap-4 rounded-xl! p-4 overflow-hidden" hideCloseButton>
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/10">
              <RiAlertFill className="size-6 text-warning" />
            </div>
            <DialogClose>
              <Cross2Icon className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
            <DialogTitle className="text-md font-medium tracking-normal">{title}</DialogTitle>
            <DialogDescription className="text-foreground-600 min-w-0 overflow-hidden">{description}</DialogDescription>
          </div>

          {/* <div className="flex justify-end gap-3"> */}
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
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
            </DialogClose>

            <Button
              type="button"
              size="sm"
              variant={confirmButtonVariant}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onConfirm();
              }}
              trailingIcon={confirmTrailingIcon}
              isLoading={isLoading}
              disabled={isConfirmDisabled}
            >
              {confirmButtonText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};
