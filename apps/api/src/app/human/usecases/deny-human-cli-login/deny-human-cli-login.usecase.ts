import { Injectable } from '@nestjs/common';
import {
  CliDeviceSessionBeingApprovedError,
  CliDeviceSessionService,
} from '../../../cli-auth/services/cli-device-session.service';
import type { HumanCliLoginDeniedResponseDto } from '../../dtos/human-account.dto';
import { loginBeingApproved } from '../approve-human-cli-login/approve-human-cli-login.usecase';
import { HumanCliLoginCommand } from '../get-human-cli-login/human-cli-login.command';

/**
 * Deny on the Human dashboard: ends the `human login` waiting for this code. The code can't be approved
 * afterwards, and the waiting CLI is told it was denied instead of being handed a key. Nothing is created
 * or moved, so no account is needed. Denying a login that is already gone is not an error, but `denied` is
 * false then: it may be gone because it was approved, and that CLI was let in. A login that is being
 * approved right now answers 409, since nobody knows yet how that approval ends.
 */
@Injectable()
export class DenyHumanCliLogin {
  constructor(private readonly cliDeviceSessionService: CliDeviceSessionService) {}

  async execute(command: HumanCliLoginCommand): Promise<HumanCliLoginDeniedResponseDto> {
    try {
      return { denied: await this.cliDeviceSessionService.denyByUserCode(command.userCode) };
    } catch (error) {
      throw error instanceof CliDeviceSessionBeingApprovedError ? loginBeingApproved() : error;
    }
  }
}
