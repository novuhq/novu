import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { UserRepository } from '@novu/dal';
import { AnalyticsService, buildUserKey, InvalidateCacheService } from '@novu/application-generic';
import { IUserEntity } from '@novu/shared';

import { UpdateProfileCommand } from './update-profile.command';

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private readonly userRepository: UserRepository,
    @Inject(forwardRef(() => AnalyticsService))
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: UpdateProfileCommand) {
    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new BadRequestException('Invalid UserId');

    const valuesToUpdate: Partial<IUserEntity> = {};

    if (command.firstName) {
      valuesToUpdate.firstName = command?.firstName?.toLowerCase();
    }
    if (command.lastName) {
      valuesToUpdate.lastName = command?.lastName?.toLowerCase();
    }
    if (command.jobTitle) {
      valuesToUpdate.jobTitle = command.jobTitle;
    }
    await this.userRepository.update(
      {
        _id: command.userId,
      },
      {
        $set: {
          ...valuesToUpdate,
        },
      }
    );

    const updatedUser = await this.userRepository.findById(command.userId);
    if (!updatedUser) throw new NotFoundException('User not found');
    await this.invalidateCache.invalidateByKey({
      key: buildUserKey({
        _id: command.userId,
      }),
    });

    if (command.firstName) {
      this.analyticsService.setValue(updatedUser?._id, 'firstName', command.firstName);
    }
    if (command.lastName) {
      this.analyticsService.setValue(updatedUser?._id, 'lastName', command.lastName);
    }
    if (command.jobTitle) {
      this.analyticsService.setValue(updatedUser?._id, 'jobTitle', command.jobTitle);
    }

    return updatedUser;
  }
}
