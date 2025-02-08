import { Button } from '@/components/primitives/button';
import { ToastClose, ToastIcon } from '@/components/primitives/sonner';
import { ReactNode } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';

interface SuccessToastProps {
  title: string;
  description: ReactNode;
  actionLabel: string;
  onAction: () => void;
  onClose: () => void;
}

export function SuccessButtonToast({ title, description, actionLabel, onAction, onClose }: SuccessToastProps) {
  return (
    <>
      <ToastIcon variant="success" />
      <div className="flex flex-1 flex-col items-start gap-2.5">
        <div className="flex flex-col items-start justify-center gap-1 self-stretch">
          <div className="text-foreground-950 text-sm font-medium">{title}</div>
          <div className="text-foreground-600 text-sm">{description}</div>
        </div>
        <div className="flex items-center justify-end gap-2 self-stretch">
          <Button
            trailingIcon={RiArrowRightSLine}
            variant="secondary"
            mode="ghost"
            size="xs"
            className="text-destructive gap-1"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
      <ToastClose className="absolute right-3 top-3" onClick={onClose} />
    </>
  );
}
