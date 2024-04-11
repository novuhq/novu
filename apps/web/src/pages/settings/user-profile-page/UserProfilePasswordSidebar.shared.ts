import { type Sidebar } from '@novu/design-system';
import { passwordConstraints } from '@novu/shared';
import { type ComponentProps } from 'react';
import { type RegisterOptions } from 'react-hook-form';
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

export const SHARED_PASSWORD_INPUT_REGISTER_OPTIONS: RegisterOptions = {
  required: 'Please input your password',
  minLength: { value: passwordConstraints.minLength, message: `Minimum ${passwordConstraints.minLength} characters` },
  maxLength: {
    value: passwordConstraints.maxLength,
    message: `Maximum ${passwordConstraints.maxLength} characters`,
  },
  pattern: {
    value: passwordConstraints.pattern,
    message:
      `The password must contain minimum ${passwordConstraints.minLength}` +
      ` and maximum ${passwordConstraints.maxLength} characters, at least one uppercase` +
      ` letter, one lowercase letter, one number and one special character #?!@$%^&*()-`,
  },
};
