import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '@novu/dal';
import { buildUserKey, InvalidateCacheService } from '@novu/application-generic';

import { UpdateOnBoardingCommand } from './update-on-boarding.command';
import type { UserResponseDto } from '../../dtos/user-response.dto';
import { BaseUserProfileUsecase } from '../base-user-profile.usecase';

@Injectable()
export class UpdateOnBoardingUsecase extends BaseUserProfileUsecase {
  constructor(private invalidateCache: InvalidateCacheService, private readonly userRepository: UserRepository) {
    super();
  }

  async execute(command: UpdateOnBoardingCommand): Promise<UserResponseDto> {
    await this.invalidateCache.invalidateByKey({
      key: buildUserKey({
        _id: command.userId,
      }),
    });

    await this.userRepository.update(
      {
        _id: command.userId,
      },
      {
        $set: {
          showOnBoarding: command.showOnBoarding,
        },
      }
    );

    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new NotFoundException('User not found');

    return this.mapToDto(user);
  }
}
