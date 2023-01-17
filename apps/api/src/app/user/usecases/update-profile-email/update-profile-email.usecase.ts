import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '@novu/dal';
import { UpdateProfileEmailCommand } from './update-profile-email.command';
import { CacheKeyPrefixEnum, InvalidateCacheService } from '../../../shared/services/cache';
import { normalizeEmail } from '../../../shared/helpers/email-normalization.service';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';

@Injectable()
export class UpdateProfileEmail {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private readonly userRepository: UserRepository,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  async execute(command: UpdateProfileEmailCommand) {
    const email = normalizeEmail(command.email);
    const user = await this.userRepository.findByEmail(email);
    if (user) throw new BadRequestException('E-mail is invalid or taken');

    await this.userRepository.update(
      {
        _id: command.userId,
      },
      {
        $set: {
          email,
        },
      }
    );

    this.invalidateCache.clearCache({
      storeKeyPrefix: [CacheKeyPrefixEnum.USER],
      credentials: {
        _id: command.userId,
      },
    });

    const updatedUser = await this.userRepository.findById(command.userId);
    if (!updatedUser) throw new NotFoundException('User not found');

    this.analyticsService.setValue(updatedUser._id, 'email', email);

    return updatedUser;
  }
}
