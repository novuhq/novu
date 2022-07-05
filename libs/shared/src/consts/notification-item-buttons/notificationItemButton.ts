import { ButtonTypeEnum } from '../../entities/messages';

export interface INotificationButtonConfig {
  key: ButtonTypeEnum;
  displayName: string;
}

export interface IButtonStyles {
  color: string;
  backGround: string;
}

const primaryButton: INotificationButtonConfig = {
  key: ButtonTypeEnum.PRIMARY,
  displayName: 'Primary',
};

const secondaryButton: INotificationButtonConfig = {
  key: ButtonTypeEnum.SECONDARY,
  displayName: 'Secondary',
};

export const darkButtonStyle = {
  primary: {
    backGroundColor: 'linear-gradient(99deg,#DD2476 0% 0%, #FF512F 100% 100%)',
    fontColor: '#FFFFFF',
    removeCircleColor: 'white',
  },
  secondary: { backGroundColor: '#3D3D4D', fontColor: '#FFFFFF', removeCircleColor: '#525266' },
};

export const lightButtonStyle = {
  primary: {
    backGroundColor: 'linear-gradient(99deg,#DD2476 0% 0%, #FF512F 100% 100%)',
    fontColor: '#FFFFFF',
    removeCircleColor: 'white',
  },
  secondary: { backGroundColor: '#F5F8FA', fontColor: '#525266', removeCircleColor: '#525266' },
};

export const notificationItemButtons: INotificationButtonConfig[] = [primaryButton, secondaryButton];
