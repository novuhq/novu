import { ReactNode } from 'react';
import { ExternalToast, toast } from 'sonner';
import { SmallToast } from './sonner';

export const smallToast = ({ children, options }: { children: ReactNode; options: ExternalToast }) => {
  return toast(<SmallToast>{children}</SmallToast>, {
    duration: 5000,
    unstyled: true,
    ...options,
  });
};
