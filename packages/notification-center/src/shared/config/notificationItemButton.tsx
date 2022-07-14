import { ButtonTypeEnum } from '@novu/shared';

export interface INotificationButtonStyles {
  key: ButtonTypeEnum;
  value: IButtonStyles;
}

export interface IButtonStyles {
  color: string;
}

const primaryButton: INotificationButtonStyles = {
  key: ButtonTypeEnum.PRIMARY,
  value: {
    color: 'blue',
  },
};

const secondaryButton: INotificationButtonStyles = {
  key: ButtonTypeEnum.SECONDARY,
  value: {
    color: 'red',
  },
};

export const notificationItemButtons: INotificationButtonStyles[] = [primaryButton, secondaryButton];
