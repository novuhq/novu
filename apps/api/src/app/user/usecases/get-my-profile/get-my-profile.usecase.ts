import { Injectable, NotFoundException, Logger } from '@nestjs/common';

import { UserRepository } from '@novu/dal';
import { createHash } from '@novu/application-generic';

import { GetMyProfileCommand } from './get-my-profile.dto';
import type { UserResponseDto } from '../../dtos/user-response.dto';
import { BaseUserProfileUsecase } from '../base-user-profile.usecase';

@Injectable()
export class GetMyProfileUsecase extends BaseUserProfileUsecase {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(command: GetMyProfileCommand): Promise<UserResponseDto> {
    Logger.verbose('Getting User from user repository in Command');
    Logger.debug('Getting user data for ' + command.userId);
    const profile = await this.userRepository.findById(command.userId);

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    /*
     * This code is added for intercom identity verification, so that we have hash value saved for all users.
     * This code can be deleted after 30 Sept, 2023.
     * Read more about Intercom Identity Verification here
     * https://www.intercom.com/help/en/articles/183-enable-identity-verification-for-web-and-mobile
     */
    if (process.env.INTERCOM_IDENTITY_VERIFICATION_SECRET_KEY && !profile.servicesHashes?.intercom) {
      const intercomSecretKey = process.env.INTERCOM_IDENTITY_VERIFICATION_SECRET_KEY as string;
      const userHashForIntercom = createHash(intercomSecretKey, profile._id);

      await this.userRepository.update(
        { _id: profile._id },
        {
          $set: {
            'servicesHashes.intercom': userHashForIntercom,
          },
        }
      );
    }

    Logger.verbose('Found User');

    return this.mapToDto(profile);
  }
}
