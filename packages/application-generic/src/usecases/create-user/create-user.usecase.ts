import { Injectable } from '@nestjs/common';
import { UserEntity, UserRepository } from '@novu/dal';
import { CreateUserCommand } from './create-user.command';

@Injectable()
export class CreateUser {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(data: CreateUserCommand): Promise<UserEntity> {
    const user = new UserEntity();

    user.email = data.email ? data.email.toLowerCase() : null;
    user.firstName = data.firstName ? data.firstName.toLowerCase() : null;
    user.lastName = data.lastName ? data.lastName.toLowerCase() : data.lastName;
    user.profilePicture = data.picture;
    user.showOnBoarding = true;
    user.tokens = [
      {
        username: data.auth.username,
        providerId: data.auth.profileId,
        provider: data.auth.provider,
        accessToken: data.auth.accessToken,
        refreshToken: data.auth.refreshToken,
        valid: true,
      },
    ];

    return await this.userRepository.create(user);
  }
}
