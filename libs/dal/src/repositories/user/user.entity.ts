import { AuthProviderEnum, IUserEntity, JobTitleEnum } from '@novu/shared';
import { Exclude } from 'class-transformer';

import { UserId } from './types';

export interface IUserToken {
  providerId: string;
  provider: AuthProviderEnum;
  accessToken: string;
  refreshToken: string;
  valid: boolean;
  username?: string;
}

export interface IUserResetTokenCount {
  reqInMinute: number;
  reqInDay: number;
}

export class UserEntity implements IUserEntity {
  _id: UserId;

  resetToken?: string;

  resetTokenDate?: string;

  resetTokenCount?: IUserResetTokenCount;

  firstName: string;

  lastName?: string | null;

  email: string;

  profilePicture?: string | null;

  @Exclude({ toPlainOnly: true })
  tokens: IUserToken[];

  @Exclude({ toPlainOnly: true })
  password?: string;

  createdAt: string;

  updatedAt: string;

  showOnBoarding?: boolean;
  showOnBoardingTour?: number;

  failedLogin?: {
    times: number;
    lastFailedAttempt: string;
  };

  servicesHashes?: { intercom?: string; plain?: string };

  jobTitle?: JobTitleEnum;

  hasPassword: boolean;

  externalId?: string;
}

export type UserDBModel = UserEntity;
