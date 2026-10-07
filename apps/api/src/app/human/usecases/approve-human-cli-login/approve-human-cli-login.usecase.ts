import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { GetDecryptedSecretKey, GetDecryptedSecretKeyCommand } from '@novu/application-generic';
import { CliDeviceSessionService } from '../../../cli-auth/services/cli-device-session.service';
import { ApproveCliDeviceSessionCommand } from '../../../cli-auth/usecases/approve-cli-device-session/approve-cli-device-session.command';
import { ApproveCliDeviceSession } from '../../../cli-auth/usecases/approve-cli-device-session/approve-cli-device-session.usecase';
import { ClaimKeylessConnectCommand } from '../../../connect/usecases/claim-keyless-connect/claim-keyless-connect.command';
import { ClaimKeylessConnect } from '../../../connect/usecases/claim-keyless-connect/claim-keyless-connect.usecase';
import type { HumanAccountCliLoginResponseDto, HumanAccountResponseDto } from '../../dtos/human-account.dto';
import { EnsureBackingOrganizationCommand } from '../ensure-backing-organization/ensure-backing-organization.command';
import { EnsureBackingOrganization } from '../ensure-backing-organization/ensure-backing-organization.usecase';
import { ApproveHumanCliLoginCommand } from './approve-human-cli-login.command';

/** Machine-readable code on the 404, so the Human dashboard can tell a wrong or expired code from a failed claim. */
export const CLI_LOGIN_NOT_FOUND_CODE = 'cli_login_not_found';

/** Claim failures keep their `claim_*` code, or get this one, so the website can offer to log in without the setup. */
export const CLAIM_FAILED_CODE = 'claim_failed';

/**
 * Approves a `human login` for a Human account, found by the code the CLI printed. The waiting CLI gets the
 * Development key of the account's backing organization, which is created first when the operator has none yet.
 * With a claim token, the CLI's keyless setup moves into the account before the CLI is let in.
 */
@Injectable()
export class ApproveHumanCliLogin {
  constructor(
    private readonly cliDeviceSessionService: CliDeviceSessionService,
    private readonly ensureBackingOrganization: EnsureBackingOrganization,
    private readonly claimKeylessConnect: ClaimKeylessConnect,
    private readonly getDecryptedSecretKey: GetDecryptedSecretKey,
    private readonly approveCliDeviceSession: ApproveCliDeviceSession
  ) {}

  async execute(command: ApproveHumanCliLoginCommand): Promise<HumanAccountCliLoginResponseDto> {
    // Checked first, so a mistyped or expired code never creates an organization or moves a setup.
    const deviceCode = await this.cliDeviceSessionService.findPendingByUserCode(command.userCode);
    if (!deviceCode) {
      throw loginNotFound();
    }

    const account = await this.ensureBackingOrganization.execute(
      EnsureBackingOrganizationCommand.create({
        humanUserId: command.humanUserId,
        firstName: command.firstName,
        lastName: command.lastName,
      })
    );

    if (command.claimToken) {
      await this.keepSetup(command.claimToken, account);
    }

    const apiKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({
        environmentId: account.environmentId,
        organizationId: account.organizationId,
      })
    );

    try {
      await this.approveCliDeviceSession.execute(
        ApproveCliDeviceSessionCommand.create({
          deviceCode,
          userId: account.userId,
          organizationId: account.organizationId,
          apiKey,
          environmentId: account.environmentId,
          userEmail: command.email ?? null,
          userFirstName: command.firstName ?? null,
          userLastName: command.lastName ?? null,
        })
      );
    } catch (error) {
      // The request ran out after the check above.
      if (error instanceof NotFoundException) {
        throw loginNotFound();
      }

      throw error;
    }

    return { ...account, keptSetup: Boolean(command.claimToken) };
  }

  private async keepSetup(token: string, account: HumanAccountResponseDto): Promise<void> {
    try {
      await this.claimKeylessConnect.execute(
        ClaimKeylessConnectCommand.create({ token, organizationId: account.organizationId, userId: account.userId })
      );
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() < 500) {
        throw new HttpException(
          { message: error.message, code: readCode(error) ?? CLAIM_FAILED_CODE },
          error.getStatus()
        );
      }

      throw error;
    }
  }
}

function loginNotFound(): NotFoundException {
  return new NotFoundException({
    message: 'No login is waiting for this code. Check the code in your terminal, or run `human login` again.',
    code: CLI_LOGIN_NOT_FOUND_CODE,
  });
}

function readCode(error: HttpException): string | undefined {
  const response = error.getResponse();
  const code = typeof response === 'object' ? (response as { code?: unknown }).code : undefined;

  return typeof code === 'string' ? code : undefined;
}
