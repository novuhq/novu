import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { UserRepository } from '@novu/dal';
import type { UserResponseDto } from '../../dtos/user-response.dto';
import { BaseUserProfileUsecase } from '../base-user-profile.usecase';
import { GetMyProfileCommand } from './get-my-profile.dto';

@Injectable()
export class GetMyProfileUsecase extends BaseUserProfileUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: PinoLogger
  ) {
    super();
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: GetMyProfileCommand): Promise<UserResponseDto> {
    this.logger.trace('Getting User from user repository in Command');
    this.logger.debug(`Getting user data for ${command.userId}`);
    const profile = await this.userRepository.findById(command.userId);

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    this.logger.trace('Found User');

    return this.mapToDto(profile);
  }
}
