import { ToastIcon } from '@/components/primitives/sonner';
import { showToast } from '@/components/primitives/sonner-helpers';

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
  setToastId(
    showToast({
      children: () => (
        <>
          <ToastIcon variant={'default'} />
          <span className="text-sm">Saving</span>
        </>
      ),
      options: {
        position: 'bottom-right',
        classNames: {
          toast: 'right-0',
        },
      },
    })
  );
};

export const showSuccessToast = (toastId?: string | number) => {
  showToast({
    children: () => (
      <>
        <ToastIcon variant="success" />
        <span className="text-sm">Saved</span>
      </>
    ),
    options: {
      position: 'bottom-right',
      classNames: {
        toast: 'right-0',
      },
      id: toastId,
    },
  });
};

export const showErrorToast = (toastId?: string | number, error?: unknown) => {
  const message = getErrorMessage(error);

  showToast({
    children: () => (
      <>
        <ToastIcon variant="error" />
        <span className="text-sm">{message}</span>
      </>
    ),
    options: {
      position: 'bottom-right',
      classNames: {
        toast: 'right-0',
      },
      id: toastId,
    },
  });
};
