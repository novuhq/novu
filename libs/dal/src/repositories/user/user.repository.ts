import { AuthProviderEnum } from '@novu/shared';
import { BaseRepository } from '../base-repository';
import { IUserRepository } from './user-repository.interface';
import { UserEntity, UserDBModel, IUserResetTokenCount } from './user.entity';
import { User } from './user.schema';
import { Inject } from '@nestjs/common';

export class UserRepository extends BaseRepository<UserDBModel, UserEntity, object> implements IUserRepository {
  constructor(@Inject('USER_REPOSITORY') private userRepository: IUserRepository) {
    super(User, UserEntity);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findByEmail(email);
  }

  async findById(id: string, select?: string): Promise<UserEntity | null> {
    return this.userRepository.findById(id, select);
  }

  async findUserByToken(token: string): Promise<UserEntity | null> {
    return this.userRepository.findUserByToken(token);
  }

  async updatePasswordResetToken(
    userId: string,
    token: string,
    resetTokenCount: IUserResetTokenCount
  ): Promise<{ matched: number; modified: number }> {
    return this.userRepository.updatePasswordResetToken(userId, token, resetTokenCount);
  }

  async findByLoginProvider(profileId: string, provider: AuthProviderEnum): Promise<UserEntity | null> {
    return this.userRepository.findByLoginProvider(profileId, provider);
  }
}
