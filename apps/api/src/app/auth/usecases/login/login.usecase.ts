import * as bcrypt from 'bcrypt';
import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '@novu/dal';
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
    if (!user.password) throw new ApiException('OAuth user login attempt');

    const isMatching = await bcrypt.compare(command.password, user.password);
    if (!isMatching) throw new ApiException('Wrong credentials provided');

    this.analyticsService.upsertUser(user, user._id);

    return {
      token: await this.authService.generateUserToken(user),
    };
  }
}
