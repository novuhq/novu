import { AuthProviderEnum } from '@novu/shared';
import { createHash } from 'crypto';
import { BaseRepository } from '../base-repository';
import { IUserResetTokenCount, UserEntity, UserDBModel } from './user.entity';
import { User } from './user.schema';

export class UserRepository extends BaseRepository<UserDBModel, UserEntity> {
  constructor() {
    super(User, UserEntity);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.findOne({
      email,
    });
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async findUserByToken(token: string) {
    return await this.findOne({
      /*
       * NOTE: $in operator is used to provide backward compatibility for users with active reset token in old (plain) format
       * in a next minor version query should be set to: { resetToken: this.hashResetToken(token) }
       */
      resetToken: { $in: [this.hashResetToken(token), token] },
    });
  }

  async updatePasswordResetToken(userId: string, token: string, resetTokenCount: IUserResetTokenCount) {
    return await this.update(
      {
        _id: userId,
      },
      {
        $set: {
          resetToken: this.hashResetToken(token),
          resetTokenDate: new Date(),
          resetTokenCount,
        },
      }
    );
  }

  async findByLoginProvider(profileId: string, provider: AuthProviderEnum): Promise<UserEntity | null> {
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
