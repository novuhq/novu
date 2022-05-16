import { AuthProviderEnum } from '@novu/shared';
import { Exclude } from 'class-transformer';

export interface IUserToken {
  providerId: string;
  provider: AuthProviderEnum;
  accessToken: string;
  refreshToken: string;
  valid: boolean;
}

export class UserEntity {
  _id: string;

  resetToken?: string;

  resetTokenDate?: string;

  firstName: string;

  lastName: string;

  email: string;

  profilePicture: string;

  @Exclude({ toPlainOnly: true })
  tokens: IUserToken[];

  @Exclude({ toPlainOnly: true })
  password?: string;

  createdAt: string;

  showOnBoarding?: boolean;
}
