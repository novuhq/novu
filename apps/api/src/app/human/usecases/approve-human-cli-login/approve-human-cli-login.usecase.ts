import { ConflictException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { GetDecryptedSecretKey, GetDecryptedSecretKeyCommand } from '@novu/application-generic';
import {
  type CliDeviceSessionApprovalHold,
  CliDeviceSessionBeingApprovedError,
  CliDeviceSessionService,
} from '../../../cli-auth/services/cli-device-session.service';
import { ApproveCliDeviceSessionCommand } from '../../../cli-auth/usecases/approve-cli-device-session/approve-cli-device-session.command';
import { ApproveCliDeviceSession } from '../../../cli-auth/usecases/approve-cli-device-session/approve-cli-device-session.usecase';
import { ClaimKeylessConnectCommand } from '../../../connect/usecases/claim-keyless-connect/claim-keyless-connect.command';
import { ClaimKeylessConnect } from '../../../connect/usecases/claim-keyless-connect/claim-keyless-connect.usecase';
import type { HumanAccountCliLoginResponseDto, HumanAccountResponseDto } from '../../dtos/human-account.dto';
import { HumanAccountAgentService } from '../../services/human-account-agent.service';
import { EnsureBackingOrganizationCommand } from '../ensure-backing-organization/ensure-backing-organization.command';
import { EnsureBackingOrganization } from '../ensure-backing-organization/ensure-backing-organization.usecase';
import { ApproveHumanCliLoginCommand } from './approve-human-cli-login.command';

/** Machine-readable code on the 404, so the Human dashboard can tell a wrong or expired code from a failed claim. */
export const CLI_LOGIN_NOT_FOUND_CODE = 'cli_login_not_found';

/** Code on the 409 for a login that another request is approving right now. It settles within moments. */
export const CLI_LOGIN_BEING_APPROVED_CODE = 'cli_login_being_approved';

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
    private readonly approveCliDeviceSession: ApproveCliDeviceSession,
    private readonly humanAccountAgent: HumanAccountAgentService
  ) {}

  async execute(command: ApproveHumanCliLoginCommand): Promise<HumanAccountCliLoginResponseDto> {
    // Held first, so a mistyped or expired code never creates an organization or moves a setup, and so the
    // login isn't denied or approved a second time while this approval prepares the account.
    const hold = await this.holdLogin(command.userCode);

    try {
      return await this.approveHeldLogin(command, hold);
    } catch (error) {
      // Nothing was approved, so the login waits again. If this fails too, the hold ends by itself: within a
      // minute, or with the login once it was kept for a move.
      await this.cliDeviceSessionService.releaseApprovalHold(hold).catch(() => undefined);

      throw error;
    }
  }

  private async holdLogin(userCode: string): Promise<CliDeviceSessionApprovalHold> {
    const hold = await this.cliDeviceSessionService.holdForApprovalByUserCode(userCode).catch((error) => {
      throw error instanceof CliDeviceSessionBeingApprovedError ? loginBeingApproved() : error;
    });
    if (!hold) {
      throw loginNotFound();
    }

    return hold;
  }

  private async approveHeldLogin(
    command: ApproveHumanCliLoginCommand,
    hold: CliDeviceSessionApprovalHold
  ): Promise<HumanAccountCliLoginResponseDto> {
    const account = await this.ensureBackingOrganization.execute(
      EnsureBackingOrganizationCommand.create({
        humanUserId: command.humanUserId,
        firstName: command.firstName,
        lastName: command.lastName,
      })
    );

    if (command.claimToken) {
      // A moved setup can't be moved back. So the move only starts while the login is still held for this
      // approval, and from here the hold is kept: nothing else answers the login until this approval does.
      if (!(await this.cliDeviceSessionService.keepApprovalHold(hold))) {
        throw loginNotFound();
      }

      await this.keepSetup(command.claimToken, account, { firstName: command.firstName, lastName: command.lastName });
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
          deviceCode: hold.deviceCode,
          userId: account.userId,
          organizationId: account.organizationId,
          apiKey,
          environmentId: account.environmentId,
          userEmail: command.email ?? null,
          userFirstName: command.firstName ?? null,
          userLastName: command.lastName ?? null,
          approvalHoldId: hold.holdId,
        })
      );
    } catch (error) {
      // The request ran out while it was held, or the hold ran out and the login was answered elsewhere.
      if (error instanceof NotFoundException) {
        throw loginNotFound();
      }

      throw error;
    }

    return { ...account, keptSetup: Boolean(command.claimToken) };
  }

  /** The agent the account got at sign-up makes way for the CLI's one, unless it's already in use. */
  private async keepSetup(
    token: string,
    account: HumanAccountResponseDto,
    name: { firstName?: string; lastName?: string }
  ): Promise<void> {
    try {
      await this.humanAccountAgent.claimOverUntouchedAgent(account, name, () =>
        this.claimKeylessConnect.execute(
          ClaimKeylessConnectCommand.create({ token, organizationId: account.organizationId, userId: account.userId })
        )
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

/** Answers both approving and denying a login that an approval holds: nobody knows yet how that approval ends. */
export function loginBeingApproved(): ConflictException {
  return new ConflictException({
    message: 'This login is being approved right now. Try again in a moment.',
    code: CLI_LOGIN_BEING_APPROVED_CODE,
  });
}

function readCode(error: HttpException): string | undefined {
  const response = error.getResponse();
  const code = typeof response === 'object' ? (response as { code?: unknown }).code : undefined;

  return typeof code === 'string' ? code : undefined;
}
