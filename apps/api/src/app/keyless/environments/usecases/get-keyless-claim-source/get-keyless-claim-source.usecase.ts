import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { isConnectClaimTokenFormat } from '@novu/shared';

import { ConnectClaimTokenService } from '../../../../connect/services/connect-claim-token.service';
import { resolveKeylessAttribution } from '../../../keyless-signup-analytics';
import { GetKeylessClaimSourceResponseDto } from '../../dtos';
import { GetKeylessClaimSourceCommand } from './get-keyless-claim-source.command';

/**
 * Who created the keyless environment behind a claim link, so the sign-up page a claim link leads to
 * attributes the signup to that creator instead of the dashboard. Reads the token without consuming it.
 */
@Injectable()
export class GetKeylessClaimSource {
  constructor(
    private readonly connectClaimTokenService: ConnectClaimTokenService,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly cacheService: CacheService
  ) {}

  async execute(command: GetKeylessClaimSourceCommand): Promise<GetKeylessClaimSourceResponseDto> {
    const keylessOrganizationId = process.env.KEYLESS_ORGANIZATION_ID;
    if (!keylessOrganizationId || !isConnectClaimTokenFormat(command.token)) {
      throw notFound();
    }

    const payload = await this.connectClaimTokenService.verify(command.token).catch(() => null);
    if (!payload || payload.org !== keylessOrganizationId) {
      throw notFound();
    }

    const environment = await this.environmentRepository.findOne(
      { _id: payload.env, _organizationId: keylessOrganizationId },
      '_id _organizationId identifier name'
    );
    if (!environment) {
      throw notFound();
    }

    return resolveKeylessAttribution(this.cacheService, environment);
  }
}

function notFound(): NotFoundException {
  return new NotFoundException('No active claim link was found for this token.');
}
