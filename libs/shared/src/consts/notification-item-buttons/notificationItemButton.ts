import { ButtonTypeEnum } from '../../entities/messages';

export interface INotificationButtonStyles {
  key: ButtonTypeEnum;
  value: IButtonStyles;
  displayName: string;
}

export interface IButtonStyles {
  color: string;
  backGround: string;
}

const primaryButton: INotificationButtonStyles = {
  key: ButtonTypeEnum.PRIMARY,
  value: {
    color: 'white',
    backGround: 'linear-gradient(99deg,#DD2476 0% 0%, #FF512F 100% 100%)', //colors.horizontal
  },
  displayName: 'Primary',
};

const secondaryButton: INotificationButtonStyles = {
  key: ButtonTypeEnum.SECONDARY,
  value: {
    color: 'white',
    backGround: '#3D3D4D', //colors.B30
  },
  displayName: 'Secondary',
};

export const notificationItemButtons: INotificationButtonStyles[] = [primaryButton, secondaryButton];
