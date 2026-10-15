import { HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';

import { ConnectClaimTokenService } from '../../../../connect/services/connect-claim-token.service';
import { resolveKeylessAgentClaimUrl } from '../../../keyless-agent-claim-url';
import {
  getKeylessAgentEnvironmentExpiresAt,
  isKeylessAgentEnvironment,
  isKeylessAgentEnvironmentExpired,
  KeylessAgentErrorCodeEnum,
} from '../../../keyless-agent-environment';
import { GetKeylessEnvironmentResponseDto } from '../../dtos';
import { GetAgentKeylessEnvironmentCommand } from './get-agent-keyless-environment.command';

@Injectable()
export class GetAgentKeylessEnvironment {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private connectClaimTokenService: ConnectClaimTokenService
  ) {}

  async execute(command: GetAgentKeylessEnvironmentCommand): Promise<GetKeylessEnvironmentResponseDto> {
    const environment = await this.environmentRepository.findOne(
      { _id: command.environmentId, _organizationId: command.organizationId },
      '_id _organizationId identifier name createdAt'
    );

    if (!environment?.createdAt || !isKeylessAgentEnvironment(environment)) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'This API key does not belong to a keyless environment.',
        code: KeylessAgentErrorCodeEnum.ENVIRONMENT_NOT_FOUND,
      });
    }

    if (isKeylessAgentEnvironmentExpired(environment.createdAt)) {
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: `This keyless environment expired on ${getKeylessAgentEnvironmentExpiresAt(environment.createdAt).toISOString()}. Create a new one or sign up at https://dashboard.novu.co.`,
        code: KeylessAgentErrorCodeEnum.ENVIRONMENT_EXPIRED,
      });
    }

    const { claimUrl, expiresAt } = await resolveKeylessAgentClaimUrl(this.connectClaimTokenService, {
      environmentId: environment._id,
      organizationId: environment._organizationId,
      createdAt: environment.createdAt,
    });

    return {
      environmentId: environment._id,
      applicationIdentifier: environment.identifier,
      status: 'active',
      expiresAt,
      claimUrl,
    };
  }
}
