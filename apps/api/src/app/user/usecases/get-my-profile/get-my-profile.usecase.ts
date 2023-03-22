import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { UserRepository } from '@novu/dal';
import { GetMyProfileCommand } from './get-my-profile.dto';

@Injectable()
export class GetMyProfileUsecase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: GetMyProfileCommand) {
    Logger.verbose('Getting User from user repository in Command');
    Logger.debug('Getting user data for ' + command.userId);
    const profile = await this.userRepository.findById(command.userId);

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    Logger.verbose('Found User');

    return profile;
  }
}
