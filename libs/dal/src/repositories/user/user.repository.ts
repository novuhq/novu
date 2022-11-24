import { AuthProviderEnum } from '@novu/shared';
import { BaseRepository } from '../base-repository';
import { UserEntity } from './user.entity';
import { User } from './user.schema';
import { Document, FilterQuery } from 'mongoose';

export class UserRepository extends BaseRepository<FilterQuery<UserEntity & Document>, UserEntity> {
  constructor() {
    super(User, UserEntity);
  }

  async findByEmail(email: string): Promise<UserEntity> {
    return this.findOne({
      email,
    });
  }

  async findUserByToken(token: string) {
    return await this.findOne({
      resetToken: token,
    });
  }

  async updatePasswordResetToken(userId: string, token: string) {
    return await this.update(
      {
        _id: userId,
      },
      {
        $set: {
          resetToken: token,
          resetTokenDate: new Date(),
        },
      }
    );
  }

  async findByLoginProvider(profileId: string, provider: AuthProviderEnum): Promise<UserEntity> {
    return this.findOne({
      'tokens.providerId': profileId,
      'tokens.provider': provider,
    });
  }

  async userExists(userId: string) {
    return !!(await this.findOne(
      {
        _id: userId,
      },
      '_id'
    ));
  }
}
