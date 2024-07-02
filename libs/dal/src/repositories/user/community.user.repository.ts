import { createHash } from 'crypto';
import { BaseRepository } from '../base-repository';
import { IUserRepository } from './user-repository.interface';
import { IUserResetTokenCount, UserEntity, UserDBModel } from './user.entity';
import { User } from './user.schema';

export class CommunityUserRepository
  extends BaseRepository<UserDBModel, UserEntity, object>
  implements IUserRepository
{
  constructor() {
    super(User, UserEntity);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.findOne({
      email,
    });
  }

  async findById(id: string, select?: string): Promise<UserEntity | null> {
    const data = await this.MongooseModel.findById(id, select);
    if (!data) return null;

    return this.mapEntity(data.toObject());
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async findUserByToken(token: string) {
    return await this.findOne({
      resetToken: this.hashResetToken(token),
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
}
