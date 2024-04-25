import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '@novu/dal';
import { buildUserKey, InvalidateCacheService } from '@novu/application-generic';

import { UpdateOnBoardingTourCommand } from './update-on-boarding-tour.command';
import type { UserResponseDto } from '../../dtos/user-response.dto';
import { BaseUserProfileUsecase } from '../base-user-profile.usecase';

@Injectable()
export class UpdateOnBoardingTourUsecase extends BaseUserProfileUsecase {
  constructor(private invalidateCache: InvalidateCacheService, private readonly userRepository: UserRepository) {
    super();
  }

  async execute(command: UpdateOnBoardingTourCommand): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new NotFoundException('User not found');

    await this.userRepository.update(
      {
        _id: command.userId,
      },
      {
        $set: {
          showOnBoardingTour: command.showOnBoardingTour,
        },
      }
    );

    await this.invalidateCache.invalidateByKey({
      key: buildUserKey({
        _id: command.userId,
      }),
    });

    const updatedUser = await this.userRepository.findById(command.userId);
    if (!updatedUser) throw new NotFoundException('User not found');

    return this.mapToDto(updatedUser);
  }
}
