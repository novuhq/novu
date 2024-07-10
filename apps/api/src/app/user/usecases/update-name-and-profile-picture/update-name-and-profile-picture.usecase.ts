import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiException, buildUserKey, InvalidateCacheService } from '@novu/application-generic';
import { UserEntity, UserRepository } from '@novu/dal';

import { BaseUserProfileUsecase } from '../base-user-profile.usecase';
import { UpdateNameAndProfilePictureCommand } from './update-name-and-profile-picture.command';

@Injectable()
export class UpdateNameAndProfilePicture extends BaseUserProfileUsecase {
  constructor(private invalidateCache: InvalidateCacheService, private readonly userRepository: UserRepository) {
    super();
  }

  async execute(command: UpdateNameAndProfilePictureCommand) {
    if (!command.firstName || !command.lastName) throw new ApiException('First name and last name are required');

    let user = await this.userRepository.findById(command.userId);
    if (!user) throw new NotFoundException('User not found');

    const updatePayload: Partial<UserEntity> = {
      firstName: command.firstName,
      lastName: command.lastName,
    };

    const unsetPayload: Partial<Record<keyof UserEntity, string>> = {};

    if (command.profilePicture) {
      updatePayload.profilePicture = command.profilePicture;
    }

    await this.userRepository.update(
      {
        _id: command.userId,
      },
      {
        $set: updatePayload,
        $unset: unsetPayload,
      }
    );

    await this.invalidateCache.invalidateByKey({
      key: buildUserKey({
        _id: command.userId,
      }),
    });

    user = await this.userRepository.findById(command.userId);
    if (!user) throw new NotFoundException('User not found');

    return this.mapToDto(user);
  }
}
