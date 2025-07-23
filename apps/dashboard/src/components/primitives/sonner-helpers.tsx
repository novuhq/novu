import { ReactNode } from 'react';
import { ExternalToast, toast } from 'sonner';
import { Toast, ToastIcon, ToastProps } from './sonner';

// Consistent toast options for bottom-center positioning like inbox-usecase-page
export const CONSISTENT_TOAST_OPTIONS: ExternalToast = {
  position: 'bottom-center',
};

export const showToast = ({
  options,
  children,
  ...toastProps
}: Omit<ToastProps, 'children'> & {
  options: ExternalToast;
  children: (args: { close: () => void }) => ReactNode;
}) => {
  return toast.custom((id) => <Toast {...toastProps}>{children({ close: () => toast.dismiss(id) })}</Toast>, {
    duration: 5000,
    unstyled: true,
    closeButton: false,
    ...CONSISTENT_TOAST_OPTIONS,
    ...options,
  });
};

export const showSuccessToast = (message: string, title?: string, options: ExternalToast = {}) => {
  showToast({
    title,
    children: () => (
      <>
        <ToastIcon variant="success" />
        <span className="text-sm">{message}</span>
      </>
    ),
    options: {
      ...CONSISTENT_TOAST_OPTIONS,
      ...options,
    },
  });
};

export const showErrorToast = (message: string | ReactNode, title?: string, options: ExternalToast = {}) => {
  showToast({
    title,
    children: () => (
      <>
        <ToastIcon variant="error" />
        <span className="text-sm">{message}</span>
      </>
    ),
    options: {
      ...CONSISTENT_TOAST_OPTIONS,
      ...options,
    },
  });
};

export const showWarningToast = (message: string | ReactNode, title?: string, options: ExternalToast = {}) => {
  showToast({
    title,
    children: () => (
      <>
        <ToastIcon variant="warning" />
        <span className="text-sm">{message}</span>
      </>
    ),
    options: {
      position: 'bottom-center',
      ...options,
    },
  });
};
