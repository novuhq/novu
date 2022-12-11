import { AuthProviderEnum } from '@novu/shared';
import { BaseRepository } from '../base-repository';
import { UserEntity } from './user.entity';
import { User } from './user.schema';
import { Document, FilterQuery } from 'mongoose';
import { Cached, ICacheService, InvalidateCache } from '../../shared';

type EnforceIdentifierQuery = FilterQuery<UserEntity & Document> & {
  _id: string;
};

export class UserRepository extends BaseRepository<FilterQuery<UserEntity & Document>, UserEntity> {
  constructor(cacheService?: ICacheService) {
    super(User, UserEntity, cacheService);
  }

  @Cached()
  async findById(id: string, select?: string): Promise<UserEntity | null> {
    return super.findById(id, select);
  }

  @InvalidateCache()
  async update(
    query: EnforceIdentifierQuery,
    updateBody: any
  ): Promise<{
    matched: number;
    modified: number;
  }> {
    return super.update(query, updateBody);
  }

  @InvalidateCache()
  async create(data: FilterQuery<UserEntity & Document>) {
    return super.create(data);
  }

  @InvalidateCache()
  async delete(query: EnforceIdentifierQuery) {
    return super.delete(query);
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
