import { ReactNode } from 'react';
import { ExternalToast, toast } from 'sonner';
import { Toast, ToastIcon, ToastProps } from './sonner';

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
    ...options,
  });
};

export const showSuccessToast = (message: string, position: 'bottom-center' | 'top-center' = 'bottom-center') => {
  showToast({
    children: () => (
      <>
        <ToastIcon variant="success" />
        <span className="text-sm">{message}</span>
      </>
    ),
    options: { position },
  });
};

export const showErrorToast = (
  message: string,
  title?: string,
  position: 'bottom-center' | 'top-center' | 'bottom-right' = 'bottom-right'
) => {
  showToast({
    title,
    children: () => (
      <>
        <ToastIcon variant="error" />
        <span className="text-sm">{message}</span>
      </>
    ),
    options: { position },
  });
};
