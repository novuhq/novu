import * as bcrypt from 'bcrypt';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { differenceInMinutes, parseISO } from 'date-fns';
import { UserRepository, UserEntity } from '@novu/dal';
import { LoginCommand } from './login.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

import { normalizeEmail } from '../../../shared/helpers/email-normalization.service';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';

@Injectable()
export class Login {
  private BLOCKED_PERIOD_IN_MINUTES = 5;
  private MAX_LOGIN_ATTEMPTS = 5;
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  async execute(command: LoginCommand) {
    const email = normalizeEmail(command.email);
    const user = await this.userRepository.findByEmail(email);
    // TODO: update it to throw relevant exceptions like NotFoundException in this case
    if (!user) throw new ApiException('User not found');

    if (this.isAccountBlocked(user)) {
      throw new UnauthorizedException(
        `Account blocked, Please try again after ${this.BLOCKED_PERIOD_IN_MINUTES} minutes`
      );
    }

    if (!user.password) throw new ApiException('OAuth user login attempt');

    const isMatching = await bcrypt.compare(command.password, user.password);
    if (!isMatching) {
      await this.updateFailedAttempts(user);
      throw new ApiException('Wrong credentials provided');
    }

    this.analyticsService.upsertUser(user, user._id);

    if (user?.failedLogin?.times > 0) {
      await this.resetFailedAttempts(user);
    }

    return {
      token: await this.authService.generateUserToken(user),
    };
  }

  private isAccountBlocked(user: UserEntity) {
    const lastFailedAttempt = user?.failedLogin?.lastFailedAttempt;
    if (!lastFailedAttempt) return false;

    const now = Date.now();
    const formattedLastAttempt = parseISO(lastFailedAttempt);
    const diff = differenceInMinutes(now, formattedLastAttempt);

    return user?.failedLogin?.times >= this.MAX_LOGIN_ATTEMPTS && diff <= this.BLOCKED_PERIOD_IN_MINUTES;
  }

  private async updateFailedAttempts(user: UserEntity) {
    const now = Date.now();
    let times = user?.failedLogin?.times ?? 1;
    const lastFailedAttempt = user?.failedLogin?.lastFailedAttempt;

    if (lastFailedAttempt) {
      const formattedLastAttempt = parseISO(lastFailedAttempt);
      const diff = differenceInMinutes(formattedLastAttempt, now);
      times = diff <= this.BLOCKED_PERIOD_IN_MINUTES ? times + 1 : times;
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
}
