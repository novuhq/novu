import { Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import { IUserRepository } from './user-repository.interface';
import { UserEntity, IUserResetTokenCount } from './user.entity';

export class UserRepository implements IUserRepository {
  constructor(@Inject('USER_REPOSITORY') private userRepository: IUserRepository) {}

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

  create(data: any, options?: any): Promise<UserEntity> {
    return this.userRepository.create(data, options);
  }

  update(query: any, body: any): Promise<{ matched: number; modified: number }> {
    return this.userRepository.update(query, body);
  }

  delete(query: any): Promise<{ acknowledged: boolean; deletedCount: number }> {
    return this.userRepository.delete(query);
  }

  count(query: any, limit?: number | undefined): Promise<number> {
    return this.userRepository.count(query, limit);
  }

  aggregate(
    query: any[],
    options?: { readPreference?: 'secondaryPreferred' | 'primary' | undefined } | undefined
  ): Promise<any> {
    return this.userRepository.aggregate(query, options);
  }

  findOne(query: any, select?: any, options?: any): Promise<UserEntity | null> {
    return this.userRepository.findOne(query, select, options);
  }

  find(query: any, select?: any, options?: any): Promise<UserEntity[]> {
    return this.userRepository.find(query, select, options);
  }

  findBatch(
    query: any,
    select?: string | undefined,
    options?: any,
    batchSize?: number | undefined
  ): AsyncGenerator<any, any, unknown> {
    return this.userRepository.findBatch(query, select, options, batchSize);
  }

  insertMany(
    data: any,
    ordered: boolean
  ): Promise<{ acknowledged: boolean; insertedCount: number; insertedIds: Types.ObjectId[] }> {
    return this.userRepository.insertMany(data, ordered);
  }

  updateOne(query: any, body: any): Promise<{ matched: number; modified: number }> {
    return this.userRepository.updateOne(query, body);
  }

  upsertMany(data: any): Promise<any> {
    return this.userRepository.upsertMany(data);
  }

  upsert(query: any, data: any): Promise<any> {
    return this.userRepository.upsert(query, data);
  }

  bulkWrite(bulkOperations: any, ordered: boolean): Promise<any> {
    return this.userRepository.bulkWrite(bulkOperations, ordered);
  }

  estimatedDocumentCount(): Promise<number> {
    return this.userRepository.estimatedDocumentCount();
  }
}
