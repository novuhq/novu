import { type Sidebar } from '@novu/design-system';
import { type ComponentProps } from 'react';
import { UserProfileFlow } from './UserProfileFlow.const';

export interface IUserProfilePasswordEmailVerificationProps {
  email: string;
  sendVerificationEmail: () => Promise<void>;
  countdownTimerSeconds: number;
}
export interface IUserProfilePasswordSidebarProps
  extends Pick<ComponentProps<typeof Sidebar>, 'isOpened' | 'onClose'>,
    Pick<IUserProfilePasswordEmailVerificationProps, 'email'> {
  setIsOpened?: (prevIsOpened: boolean) => void;
  currentFlow: UserProfileFlow;
}
