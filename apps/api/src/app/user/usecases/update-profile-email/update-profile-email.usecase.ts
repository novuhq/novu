import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { UserRepository } from '@novu/dal';
import {
  AnalyticsService,
  buildAuthServiceKey,
  buildUserKey,
  decryptApiKey,
  InvalidateCacheService,
} from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';

import { UpdateProfileEmailCommand } from './update-profile-email.command';
import { normalizeEmail } from '../../../shared/helpers/email-normalization.service';
import type { UserResponseDto } from '../../dtos/user-response.dto';
import { BaseUserProfileUsecase } from '../base-user-profile.usecase';

@Injectable()
export class UpdateProfileEmail extends BaseUserProfileUsecase {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private readonly userRepository: UserRepository,
    private readonly environmentRepository: EnvironmentRepository,
    @Inject(forwardRef(() => AnalyticsService))
    private analyticsService: AnalyticsService
  ) {
    super();
  }

  async execute(command: UpdateProfileEmailCommand): Promise<UserResponseDto> {
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

    await this.invalidateCache.invalidateByKey({
      key: buildUserKey({
        _id: command.userId,
      }),
    });

    const apiKeys = await this.environmentRepository.getApiKeys(command.environmentId);

    const decryptedApiKey = decryptApiKey(apiKeys[0].key);

    await this.invalidateCache.invalidateByKey({
      key: buildAuthServiceKey({
        apiKey: decryptedApiKey,
      }),
    });

    const updatedUser = await this.userRepository.findById(command.userId);
    if (!updatedUser) throw new NotFoundException('User not found');

    this.analyticsService.setValue(updatedUser._id, 'email', email);

    return this.mapToDto(updatedUser);
  }
}
