import { Injectable, NotFoundException } from '@nestjs/common';
import { CliDeviceSessionService } from '../../../cli-auth/services/cli-device-session.service';
import type { HumanCliLoginResponseDto } from '../../dtos/human-account.dto';
import { CLI_LOGIN_NOT_FOUND_CODE } from '../approve-human-cli-login/approve-human-cli-login.usecase';
import { HumanCliLoginCommand } from './human-cli-login.command';

/**
 * What the Human dashboard shows before a `human login` is approved or denied: whether a login is still
 * waiting for the code in the link, and the computer it was started on. Reading it changes nothing.
 */
@Injectable()
export class GetHumanCliLogin {
  constructor(private readonly cliDeviceSessionService: CliDeviceSessionService) {}

  async execute(command: HumanCliLoginCommand): Promise<HumanCliLoginResponseDto> {
    const pending = await this.cliDeviceSessionService.getPendingByUserCode(command.userCode);
    if (!pending) {
      // Approved, denied, expired and never-issued codes all look the same from here.
      throw new NotFoundException({
        message: 'No login is waiting for this code. Run `human login` again.',
        code: CLI_LOGIN_NOT_FOUND_CODE,
      });
    }

    return { userCode: command.userCode, ...(pending.machineName ? { machineName: pending.machineName } : {}) };
  }
}
