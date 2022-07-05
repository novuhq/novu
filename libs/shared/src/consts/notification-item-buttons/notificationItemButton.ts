import { ButtonTypeEnum } from '../../entities/messages';

export interface INotificationButtonStyles {
  key: ButtonTypeEnum;
  displayName: string;
}

export interface IButtonStyles {
  color: string;
  backGround: string;
}

const primaryButton: INotificationButtonStyles = {
  key: ButtonTypeEnum.PRIMARY,
  displayName: 'Primary',
};

const secondaryButton: INotificationButtonStyles = {
  key: ButtonTypeEnum.SECONDARY,
  displayName: 'Secondary',
};

export const notificationItemButtons: INotificationButtonStyles[] = [primaryButton, secondaryButton];
