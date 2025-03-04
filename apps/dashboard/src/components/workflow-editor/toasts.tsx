import { ToastIcon } from '@/components/primitives/sonner';
import { showToast } from '@/components/primitives/sonner-helpers';

const DETAILED_ERROR_MESSAGES = ['Workflow steps limit exceeded', 'Workflow limit exceeded'] as const;

function getErrorMessage(error?: any): string {
  if (!error?.message) return 'Failed to save';

  return DETAILED_ERROR_MESSAGES.some((message) => error.message.includes(message)) ? error.message : 'Failed to save';
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

export const showSuccessToast = (toastId: string | number) => {
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

export const showErrorToast = (toastId: string | number, error?: any) => {
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
