import { Types } from 'mongoose';
import { IUserResetTokenCount, UserEntity } from './user.entity';

export interface IUserRepository extends IUserRepositoryMongo {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string, select?: string): Promise<UserEntity | null>;
  findUserByToken(token: string): Promise<UserEntity | null>;
  updatePasswordResetToken(
    userId: string,
    token: string,
    resetTokenCount: IUserResetTokenCount
  ): Promise<{ matched: number; modified: number }>;
}

/**
 * MongoDB specific methods from base-repository.ts to achieve
 * common interface for EE and Community repositories
 */
export interface IUserRepositoryMongo {
  create(data: any, options?: any): Promise<UserEntity>;
  update(query: any, body: any): Promise<{ matched: number; modified: number }>;
  delete(query: any): Promise<{ acknowledged: boolean; deletedCount: number }>;
  count(query: any, limit?: number): Promise<number>;
  aggregate(query: any[], options?: { readPreference?: 'secondaryPreferred' | 'primary' }): Promise<any>;
  findOne(query: any, select?: any, options?: any): Promise<UserEntity | null>;
  find(query: any, select?: any, options?: any): Promise<UserEntity[]>;
  findBatch(query: any, select?: string, options?: any, batchSize?: number): AsyncGenerator<any>;
  insertMany(
    data: any,
    ordered: boolean
  ): Promise<{ acknowledged: boolean; insertedCount: number; insertedIds: Types.ObjectId[] }>;
  updateOne(query: any, body: any): Promise<{ matched: number; modified: number }>;
  upsertMany(data: any): Promise<any>;
  upsert(query: any, data: any): Promise<any>;
  bulkWrite(bulkOperations: any, ordered: boolean): Promise<any>;
  estimatedDocumentCount(): Promise<number>;
}
