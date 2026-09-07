/** biome-ignore-all lint/correctness/useUniqueElementIds: expected */
import { IEnvironment } from '@novu/shared';
import { Cross2Icon } from '@radix-ui/react-icons';
import { useState } from 'react';
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
import { Input } from '@/components/primitives/input';

interface RegenerateApiKeysDialogProps {
  environment?: IEnvironment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const RegenerateApiKeysDialog = ({
  environment,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: RegenerateApiKeysDialogProps) => {
  const [environmentName, setEnvironmentName] = useState('');

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEnvironmentName('');
    }

    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    onConfirm();
    setEnvironmentName('');
  };

  const isConfirmDisabled = environmentName !== environment?.name || isLoading;

  if (!environment) {
    return null;
  }

  return (
    <Dialog modal open={open} onOpenChange={handleOpenChange}>
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

          <div className="flex flex-col gap-1">
            <DialogTitle className="text-md font-medium">Regenerate API Keys</DialogTitle>
            <DialogDescription className="text-foreground-600 space-y-3">
              <p>
                This action will invalidate all existing API keys for the{' '}
                <span className="font-semibold">{environment.name}</span> environment.
              </p>
              <p className="text-sm">
                All applications using the current keys will need to be updated with the new keys immediately after
                regeneration.
              </p>
            </DialogDescription>
          </div>

          <div className="w-full space-y-2">
            <label htmlFor="environment-confirmation" className="text-foreground-700 text-sm font-medium">
              Type <span className="font-semibold">{environment.name}</span> to confirm
            </label>
            <Input
              id="environment-confirmation"
              placeholder={`Enter "${environment.name}" to confirm`}
              value={environmentName}
              onChange={(e) => setEnvironmentName(e.target.value)}
              autoFocus
              autoComplete="off"
              className="font-mono"
            />
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
                  handleOpenChange(false);
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
                handleConfirm();
              }}
              isLoading={isLoading}
              disabled={isConfirmDisabled}
            >
              Regenerate Keys
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};
