import * as bcrypt from 'bcrypt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { differenceInMinutes, parseISO } from 'date-fns';
import { UserRepository, UserEntity, OrganizationRepository } from '@novu/dal';
import { AnalyticsService, AuthService, createHash } from '@novu/application-generic';

import { LoginCommand } from './login.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { normalizeEmail } from '../../../shared/helpers/email-normalization.service';

@Injectable()
export class Login {
  private BLOCKED_PERIOD_IN_MINUTES = 5;
  private MAX_LOGIN_ATTEMPTS = 5;
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService,
    private analyticsService: AnalyticsService,
    private organizationRepository: OrganizationRepository
  ) {}

  async execute(command: LoginCommand) {
    const email = normalizeEmail(command.email);
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      /**
       * maxWaitTime and minWaitTime(millisecond) are used to mimic the delay for server response times
       * received for existing users flow
       */
      const maxWaitTime = 110;
      const minWaitTime = 90;
      const randomWaitTime = Math.floor(Math.random() * (maxWaitTime - minWaitTime) + minWaitTime);
      await new Promise((resolve) => setTimeout(resolve, randomWaitTime)); // will wait randomly for the chosen time to sync response time

      throw new UnauthorizedException('Incorrect email or password provided.');
    }

    if (this.isAccountBlocked(user) && user.failedLogin) {
      const blockedMinutesLeft = this.getBlockedMinutesLeft(user.failedLogin.lastFailedAttempt);
      throw new UnauthorizedException(`Account blocked, Please try again after ${blockedMinutesLeft} minutes`);
    }

    // TODO: Trigger a password reset flow automatically for existing OAuth users instead of throwing an error
    if (!user.password) throw new ApiException('Please sign in using Github.');

    const isMatching = await bcrypt.compare(command.password, user.password);
    if (!isMatching) {
      const failedAttempts = await this.updateFailedAttempts(user);
      const remainingAttempts = this.MAX_LOGIN_ATTEMPTS - failedAttempts;

      if (remainingAttempts === 0 && user.failedLogin) {
        const blockedMinutesLeft = this.getBlockedMinutesLeft(user.failedLogin.lastFailedAttempt);
        throw new UnauthorizedException(`Account blocked, Please try again after ${blockedMinutesLeft} minutes`);
      }

      if (remainingAttempts < 3) {
        throw new UnauthorizedException(`Incorrect email or password provided. ${remainingAttempts} Attempts left`);
      }

      throw new UnauthorizedException(`Incorrect email or password provided.`);
    }

    if (process.env.INTERCOM_IDENTITY_VERIFICATION_SECRET_KEY && !user.servicesHashes?.intercom) {
      const intercomSecretKey = process.env.INTERCOM_IDENTITY_VERIFICATION_SECRET_KEY as string;
      const userHashForIntercom = createHash(intercomSecretKey, user._id);
      await this.userRepository.update(
        { _id: user._id },
        {
          $set: {
            'servicesHashes.intercom': userHashForIntercom,
          },
        }
      );
    }

    this.analyticsService.upsertUser(user, user._id);

    const userActiveOrganizations = (await this.organizationRepository.findUserActiveOrganizations(user._id)) || [];
    this.analyticsService.track('[Authentication] - Login', user._id, {
      loginType: 'email',
      _organization:
        userActiveOrganizations && userActiveOrganizations[0] ? userActiveOrganizations[0]?._id : undefined,
    });

    if (user?.failedLogin && user?.failedLogin?.times > 0) {
      await this.resetFailedAttempts(user);
    }

    return {
      token: await this.authService.generateUserToken(user),
    };
  }

  private isAccountBlocked(user: UserEntity) {
    const lastFailedAttempt = user?.failedLogin?.lastFailedAttempt;
    if (!lastFailedAttempt) return false;

    const diff = this.getTimeDiffForAttempt(lastFailedAttempt);

    return (
      user?.failedLogin && user?.failedLogin?.times >= this.MAX_LOGIN_ATTEMPTS && diff < this.BLOCKED_PERIOD_IN_MINUTES
    );
  }

  private async updateFailedAttempts(user: UserEntity) {
    const now = new Date();
    let times = user?.failedLogin?.times ?? 1;
    const lastFailedAttempt = user?.failedLogin?.lastFailedAttempt;

    if (lastFailedAttempt) {
      const diff = this.getTimeDiffForAttempt(lastFailedAttempt);
      times = diff < this.BLOCKED_PERIOD_IN_MINUTES ? times + 1 : 1;
    }

    await this.userRepository.update(
      {
        _id: user._id,
      },
      {
        $set: {
          failedLogin: {
            times,
            lastFailedAttempt: now,
          },
        },
      }
    );

    return times;
  }

  private async resetFailedAttempts(user: UserEntity) {
    await this.userRepository.update(
      {
        _id: user._id,
      },
      {
        $set: {
          'failedLogin.times': 0,
        },
      }
    );
  }

  private getTimeDiffForAttempt(lastFailedAttempt: string) {
    const now = new Date();
    const formattedLastAttempt = parseISO(lastFailedAttempt);
    const diff = differenceInMinutes(now, formattedLastAttempt);

    return diff;
  }

  private getBlockedMinutesLeft(lastFailedAttempt: string) {
    const diff = this.getTimeDiffForAttempt(lastFailedAttempt);

    return this.BLOCKED_PERIOD_IN_MINUTES - diff;
  }
}
