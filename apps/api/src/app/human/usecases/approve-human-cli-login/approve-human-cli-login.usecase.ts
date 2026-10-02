import { Injectable } from '@nestjs/common';
import { GetDecryptedSecretKey, GetDecryptedSecretKeyCommand } from '@novu/application-generic';
import { ApproveCliDeviceSessionCommand } from '../../../cli-auth/usecases/approve-cli-device-session/approve-cli-device-session.command';
import { ApproveCliDeviceSession } from '../../../cli-auth/usecases/approve-cli-device-session/approve-cli-device-session.usecase';
import type { HumanAccountCliLoginResponseDto } from '../../dtos/human-account.dto';
import { EnsureBackingOrganizationCommand } from '../ensure-backing-organization/ensure-backing-organization.command';
import { EnsureBackingOrganization } from '../ensure-backing-organization/ensure-backing-organization.usecase';
import { ApproveHumanCliLoginCommand } from './approve-human-cli-login.command';

/**
 * Approves a `human login` request for a Human account. The waiting CLI gets the Development environment's
 * secret key of the account's backing organization, which is created first when the operator has none yet.
 */
@Injectable()
export class ApproveHumanCliLogin {
  constructor(
    private readonly ensureBackingOrganization: EnsureBackingOrganization,
    private readonly getDecryptedSecretKey: GetDecryptedSecretKey,
    private readonly approveCliDeviceSession: ApproveCliDeviceSession
  ) {}

  async execute(command: ApproveHumanCliLoginCommand): Promise<HumanAccountCliLoginResponseDto> {
    const account = await this.ensureBackingOrganization.execute(
      EnsureBackingOrganizationCommand.create({
        humanUserId: command.humanUserId,
        firstName: command.firstName,
        lastName: command.lastName,
      })
    );
    const apiKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({
        environmentId: account.environmentId,
        organizationId: account.organizationId,
      })
    );

    await this.approveCliDeviceSession.execute(
      ApproveCliDeviceSessionCommand.create({
        deviceCode: command.deviceCode,
        userId: account.userId,
        organizationId: account.organizationId,
        apiKey,
        environmentId: account.environmentId,
        userEmail: command.email ?? null,
        userFirstName: command.firstName ?? null,
        userLastName: command.lastName ?? null,
      })
    );

    return { environmentId: account.environmentId };
  }
}
