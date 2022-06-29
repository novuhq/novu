export enum ButtonType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
}

export interface INotificationButtonStyles {
  key: ButtonType;
  value: IButtonStyles;
}

export interface IButtonStyles {
  color: string;
}

const primaryButton: INotificationButtonStyles = {
  key: ButtonType.PRIMARY,
  value: {
    color: 'blue',
  },
};

const secondaryButton: INotificationButtonStyles = {
  key: ButtonType.SECONDARY,
  value: {
    color: 'red',
  },
};

export const notificationItemButtons: INotificationButtonStyles[] = [primaryButton, secondaryButton];
