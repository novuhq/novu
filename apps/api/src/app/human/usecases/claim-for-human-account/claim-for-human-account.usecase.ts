import { Injectable } from '@nestjs/common';
import { ClaimKeylessConnectCommand } from '../../../connect/usecases/claim-keyless-connect/claim-keyless-connect.command';
import { ClaimKeylessConnect } from '../../../connect/usecases/claim-keyless-connect/claim-keyless-connect.usecase';
import type { HumanAccountClaimResponseDto } from '../../dtos/human-account.dto';
import { EnsureBackingOrganizationCommand } from '../ensure-backing-organization/ensure-backing-organization.command';
import { EnsureBackingOrganization } from '../ensure-backing-organization/ensure-backing-organization.usecase';
import { ClaimForHumanAccountCommand } from './claim-for-human-account.command';

/**
 * Moves a keyless setup into the operator's backing organization, creating that organization first
 * when the operator signed up through the claim link.
 */
@Injectable()
export class ClaimForHumanAccount {
  constructor(
    private readonly ensureBackingOrganization: EnsureBackingOrganization,
    private readonly claimKeylessConnect: ClaimKeylessConnect
  ) {}

  async execute(command: ClaimForHumanAccountCommand): Promise<HumanAccountClaimResponseDto> {
    const backingOrganization = await this.ensureBackingOrganization.execute(
      EnsureBackingOrganizationCommand.create({
        humanUserId: command.humanUserId,
        firstName: command.firstName,
        lastName: command.lastName,
      })
    );

    return this.claimKeylessConnect.execute(
      ClaimKeylessConnectCommand.create({
        token: command.token,
        organizationId: backingOrganization.organizationId,
        userId: backingOrganization.userId,
      })
    );
  }
}
