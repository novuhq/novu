import { Injectable } from '@nestjs/common';
import { CliDeviceSessionService } from '../../../cli-auth/services/cli-device-session.service';
import type { HumanCliLoginDeniedResponseDto } from '../../dtos/human-account.dto';
import { HumanCliLoginCommand } from '../get-human-cli-login/human-cli-login.command';

/**
 * Deny on the Human dashboard: ends the `human login` waiting for this code. The code can't be approved
 * afterwards, and the waiting CLI is told it was denied instead of being handed a key. Nothing is created
 * or moved, so no account is needed. Denying a login that is already gone is not an error: either way
 * nobody gets in with this code.
 */
@Injectable()
export class DenyHumanCliLogin {
  constructor(private readonly cliDeviceSessionService: CliDeviceSessionService) {}

  async execute(command: HumanCliLoginCommand): Promise<HumanCliLoginDeniedResponseDto> {
    return { denied: await this.cliDeviceSessionService.denyByUserCode(command.userCode) };
  }
}
