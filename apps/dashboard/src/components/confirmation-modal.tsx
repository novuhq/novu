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
}: ConfirmationModalProps) => {
  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="overflow-hidden sm:max-w-[440px]">
          <div className="flex items-start gap-4 self-stretch">
            <div className="bg-warning/10 flex items-center justify-center gap-2 rounded-[10px] p-2">
              <RiAlertFill className="text-warning size-6" />
            </div>
            <div className="flex flex-1 flex-col items-start gap-1">
              <DialogTitle className="text-md font-medium">{title}</DialogTitle>
              <DialogDescription className="text-foreground-600">{description}</DialogDescription>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild aria-label="Close">
              <Button type="button" size="sm" mode="outline" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </DialogClose>

            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={onConfirm}
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
