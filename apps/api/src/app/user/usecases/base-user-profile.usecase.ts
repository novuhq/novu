import type { UserEntity } from '@novu/dal';
import { UserResponseDto } from '../dtos/user-response.dto';

export class BaseUserProfileUsecase {
  protected mapToDto(user: UserEntity): UserResponseDto {
    const {
      _id,
      resetToken,
      resetTokenDate,
      firstName,
      lastName,
      email,
      profilePicture,
      createdAt,
      showOnBoarding,
      servicesHashes,
      jobTitle,
      password,
    } = user;

    return {
      _id,
      resetToken,
      resetTokenDate,
      firstName,
      lastName,
      email,
      profilePicture,
      createdAt,
      showOnBoarding,
      servicesHashes,
      jobTitle,
      hasPassword: !!password,
    };
  }
}
