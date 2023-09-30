import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '@novu/dal';
import { buildUserKey, InvalidateCacheService } from '@novu/application-generic';

import { UpdateOnBoardingTourCommand } from './update-on-boarding-tour.command';

@Injectable()
export class UpdateOnBoardingTourUsecase {
  constructor(private invalidateCache: InvalidateCacheService, private readonly userRepository: UserRepository) {}

  async execute(command: UpdateOnBoardingTourCommand) {
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

    return updatedUser;
  }
}
