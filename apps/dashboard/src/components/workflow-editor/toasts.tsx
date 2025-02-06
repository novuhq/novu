import { ToastIcon } from '@/components/primitives/sonner';
import { showToast } from '@/components/primitives/sonner-helpers';

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

export const showErrorToast = (toastId: string | number) => {
  showToast({
    children: () => (
      <>
        <ToastIcon variant="error" />
        <span className="text-sm">Failed to save</span>
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
