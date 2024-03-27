import { Injectable, UnauthorizedException } from '@nestjs/common';
import { buildUserKey, InvalidateCacheService } from '@novu/application-generic';
import { UserRepository } from '@novu/dal';
import * as bcrypt from 'bcrypt';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { UpdatePasswordCommand } from './update-password.command';

@Injectable()
export class UpdatePassword {
  constructor(private invalidateCache: InvalidateCacheService, private userRepository: UserRepository) {}

  async execute(command: UpdatePasswordCommand) {
    if (command.newPassword !== command.confirmPassword) {
      throw new ApiException('Passwords do not match.');
    }

    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    if (!user.password) {
      throw new ApiException('OAuth user cannot change password.');
    }

    const isAuthorized = await bcrypt.compare(command.currentPassword, user.password);

    if (!isAuthorized) {
      throw new UnauthorizedException();
    }

    await this.setNewPassword(user._id, command.newPassword);

    await this.invalidateCache.invalidateByKey({
      key: buildUserKey({
        _id: user._id,
      }),
    });
  }

  private async setNewPassword(userId: string, newPassword: string) {
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await this.userRepository.update(
      {
        _id: userId,
      },
      {
        $set: {
          password: newPasswordHash,
        },
      }
    );
  }
}
