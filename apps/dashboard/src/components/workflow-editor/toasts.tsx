import { RiLoader4Line } from 'react-icons/ri';
import { toast } from 'sonner';
import { Toast, ToastIcon } from '@/components/primitives/sonner';

const DETAILED_ERROR_MESSAGES = [
  'Workflow steps limit exceeded',
  'Workflow limit exceeded',
  'Insufficient permissions',
] as const;

function getErrorMessage(error?: unknown): string {
  if (!error || typeof error !== 'object' || error === null || !('message' in error)) {
    return 'Failed to save';
  }

  const message = (error as { message?: unknown }).message;
  const messageText = typeof message === 'string' ? message : '';

  return DETAILED_ERROR_MESSAGES.some((detailed) => messageText.includes(detailed)) ? messageText : 'Failed to save';
}

export const showSavingToast = (setToastId: (toastId: string | number) => void) => {
  const id = toast.custom(
    () => (
      <Toast variant="default">
        <RiLoader4Line className="min-w-5 size-5 p-[2px] animate-spin text-icon-soft" />
        <span className="text-sm">Saving</span>
      </Toast>
    ),
    {
      position: 'bottom-right',
      classNames: {
        toast: 'right-0',
      },
    }
  );
  setToastId(id);
};

export const showSuccessToast = (toastId?: string | number) => {
  if (!toastId) return;

  toast.custom(
    () => (
      <Toast variant="default">
        <ToastIcon variant="success" />
        <span className="text-sm">Saved</span>
      </Toast>
    ),
    {
      position: 'bottom-right',
      classNames: {
        toast: 'right-0',
      },
      id: toastId,
    }
  );
};

export const showErrorToast = (toastId?: string | number, error?: unknown) => {
  const message = getErrorMessage(error);

  toast.custom(
    () => (
      <Toast variant="default">
        <ToastIcon variant="error" />
        <span className="text-sm">{message}</span>
      </Toast>
    ),
    {
      ...(toastId && { id: toastId }),
      position: 'bottom-right',
      classNames: {
        toast: 'right-0',
      },
    }
  );
};
