import { type Sidebar } from '@novu/design-system';
import { type ComponentProps } from 'react';

export interface IUserProfilePasswordEmailVerificationProps {
  email: string;
  handleSendLinkEmail: () => Promise<void>;
  countdownTimerSeconds: number;
}
export interface IUserProfilePasswordSidebarProps
  extends Pick<ComponentProps<typeof Sidebar>, 'isOpened' | 'onClose'>,
    IUserProfilePasswordEmailVerificationProps {
  setIsOpened?: (prevIsOpened: boolean) => void;
  token?: string;
  hasPassword: boolean;
}
