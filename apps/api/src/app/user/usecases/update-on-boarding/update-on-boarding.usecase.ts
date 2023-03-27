import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '@novu/dal';
import { UpdateOnBoardingCommand } from './update-on-boarding.command';
import { CacheKeyPrefixEnum, InvalidateCacheService } from '../../../shared/services/cache';

@Injectable()
export class UpdateOnBoardingUsecase {
  constructor(private invalidateCache: InvalidateCacheService, private readonly userRepository: UserRepository) {}

  async execute(command: UpdateOnBoardingCommand) {
    this.invalidateCache.clearCache({
      storeKeyPrefix: [CacheKeyPrefixEnum.USER],
      credentials: {
        _id: command.userId,
      },
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

    return user;
  }
}
