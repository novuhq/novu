import { AuthProviderEnum } from '@novu/shared';
import { IUserResetTokenCount, UserEntity } from './user.entity';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string, select?: string): Promise<UserEntity | null>;
  findUserByToken(token: string): Promise<UserEntity | null>;
  updatePasswordResetToken(
    userId: string,
    token: string,
    resetTokenCount: IUserResetTokenCount
  ): Promise<{ matched: number; modified: number }>;
  findByLoginProvider(profileId: string, provider: AuthProviderEnum): Promise<UserEntity | null>;
}
