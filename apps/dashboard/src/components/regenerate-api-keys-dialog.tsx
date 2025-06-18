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
import { IEnvironment } from '@novu/shared';
import { useState } from 'react';
import { RiAlertFill } from 'react-icons/ri';

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
        <DialogContent className="overflow-hidden sm:max-w-[440px]">
          <div className="flex items-start gap-4 self-stretch">
            <div className="bg-warning/10 flex items-center justify-center gap-2 rounded-[10px] p-2">
              <RiAlertFill className="text-warning size-6" />
            </div>
            <div className="flex flex-1 flex-col items-start gap-1">
              <DialogTitle className="text-md font-medium">Regenerate API Keys</DialogTitle>
              <DialogDescription className="text-foreground-600">
                This will invalidate all existing API keys for the <span className="font-bold">{environment.name}</span>{' '}
                environment. All applications using the current keys will need to be updated with the new keys.
                <br />
                <br />
                Type <span className="font-bold">{environment.name}</span> to confirm:
              </DialogDescription>
            </div>
          </div>
          <div className="mt-4">
            <Input
              placeholder={environment.name}
              value={environmentName}
              onChange={(e) => setEnvironmentName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild aria-label="Close">
              <Button type="button" size="sm" mode="outline" variant="secondary" onClick={() => handleOpenChange(false)}>
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
