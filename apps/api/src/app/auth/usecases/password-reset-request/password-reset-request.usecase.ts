import { Injectable } from '@nestjs/common';
import { Novu } from '@novu/node';
import { UserRepository } from '@novu/dal';
import { v4 as uuidv4 } from 'uuid';
import { normalizeEmail } from '../../../shared/helpers/email-normalization.service';
import { PasswordResetRequestCommand } from './password-reset-request.command';

@Injectable()
export class PasswordResetRequest {
  constructor(private userRepository: UserRepository) {}

  async execute(command: PasswordResetRequestCommand): Promise<{ success: boolean }> {
    const email = normalizeEmail(command.email);
    const foundUser = await this.userRepository.findByEmail(email);
    if (foundUser) {
      const token = uuidv4();

      await this.userRepository.updatePasswordResetToken(foundUser._id, token);

      if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'prod') {
        const novu = new Novu(process.env.NOVU_API_KEY);

        await novu.trigger(process.env.NOVU_TEMPLATEID_PASSWORD_RESET || 'password-reset-llS-wzWMq', {
          to: {
            subscriberId: foundUser._id,
            email: foundUser.email,
          },
          payload: {
            resetPasswordLink: `${process.env.FRONT_BASE_URL}/auth/reset/${token}`,
          },
        });
      }
    }

    return {
      success: true,
    };
  }
}
