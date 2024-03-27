import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiException, buildUserKey, InvalidateCacheService } from '@novu/application-generic';
import { UserEntity, UserRepository } from '@novu/dal';
import { UpdateNameAndProfilePictureCommand } from './update-name-and-profile-picture.command';

@Injectable()
export class UpdateNameAndProfilePicture {
  constructor(private invalidateCache: InvalidateCacheService, private readonly userRepository: UserRepository) {}

  async execute(command: UpdateNameAndProfilePictureCommand) {
    if (!command.firstName || !command.lastName) throw new ApiException('First name and last name are required');

    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new NotFoundException('User not found');

    const updatePayload: Partial<UserEntity> = {
      firstName: command.firstName,
      lastName: command.lastName,
    };

    const unsetPayload: Partial<Record<keyof UserEntity, string>> = {};

    // if imageUrl exists, update the profile picture to the imageUrl, otherwise, unset/remove it
    if (command.imageUrl) {
      updatePayload.profilePicture = command.imageUrl;
    } else {
      unsetPayload.profilePicture = '';
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
  }
}
