import { IEnvironment } from '@novu/shared';
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
        <DialogContent className="overflow-hidden sm:max-w-[480px]">
          <div className="flex items-start gap-4 self-stretch">
            <div className="bg-warning/10 flex items-center justify-center gap-2 rounded-[10px] p-2">
              <RiAlertFill className="text-warning size-6" />
            </div>
            <div className="flex flex-1 flex-col items-start gap-3">
              <DialogTitle className="text-md font-medium">Regenerate API Keys</DialogTitle>
              <DialogDescription className="text-foreground-600 space-y-3">
                <p>
                  This action will invalidate all existing API keys for the{' '}
                  <span className="text-foreground-950 font-semibold">{environment.name}</span> environment.
                </p>
                <p className="text-sm">
                  All applications using the current keys will need to be updated with the new keys immediately after
                  regeneration.
                </p>
              </DialogDescription>

              <div className="w-full space-y-2">
                <label htmlFor="environment-confirmation" className="text-foreground-700 text-sm font-medium">
                  Type <span className="text-foreground-950 font-semibold">{environment.name}</span> to confirm
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
            </div>
          </div>

          <DialogFooter className="gap-3">
            <DialogClose asChild aria-label="Close">
              <Button
                type="button"
                size="sm"
                mode="outline"
                variant="secondary"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
            </DialogClose>

            <Button
              type="button"
              size="sm"
              variant="error"
              onClick={handleConfirm}
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
