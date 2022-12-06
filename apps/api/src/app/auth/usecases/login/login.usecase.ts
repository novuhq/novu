import * as bcrypt from 'bcrypt';
import { Inject, Injectable } from '@nestjs/common';
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
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  async execute(command: LoginCommand) {
    const email = normalizeEmail(command.email);
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new ApiException('User not found');

    if (this.isAccountBlocked(user)) {
      throw new ApiException('Account blocked, Please try again after 5 minutes');
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

    return user?.failedLogin?.times >= 5 && diff <= 5;
  }

  private async updateFailedAttempts(user: UserEntity) {
    const now = Date.now();
    let times = user?.failedLogin?.times ?? 1;
    const lastFailedAttempt = user?.failedLogin?.lastFailedAttempt;

    if (lastFailedAttempt) {
      const formattedLastAttempt = parseISO(lastFailedAttempt);
      const diff = differenceInMinutes(formattedLastAttempt, now);
      times = diff <= 5 ? times + 1 : times;
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
