import { Injectable } from '@nestjs/common';
import { Novu } from '@novu/node';
import { UserRepository } from '@notifire/dal';
import { v4 as uuidv4 } from 'uuid';
import { PasswordResetRequestCommand } from './password-reset-request.command';

@Injectable()
export class PasswordResetRequest {
  constructor(private userRepository: UserRepository) {}

  async execute(command: PasswordResetRequestCommand): Promise<{ success: boolean }> {
    const foundUser = await this.userRepository.findByEmail(command.email);
    if (foundUser) {
      const token = uuidv4();

      await this.userRepository.updatePasswordResetToken(foundUser._id, token);

      if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'prod') {
        const novu = new Novu(process.env.NOVU_API_KEY);

        await novu.trigger('password-reset-llS-wzWMq', {
          $user_id: foundUser._id,
          resetPasswordLink: `${process.env.FRONT_BASE_URL}/auth/reset/${token}`,
          $email: foundUser.email,
        });
      }
    }

    return {
      success: true,
    };
  }
}
