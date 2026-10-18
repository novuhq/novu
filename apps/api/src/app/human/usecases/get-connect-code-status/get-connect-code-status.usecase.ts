import { Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import type { ConnectCodeStatusResponseDto } from '../../dtos/human-host.dto';
import {
  CONNECT_CODE_INVALID,
  HumanConnectCodeService,
  keyFingerprint,
} from '../../services/human-connect-code.service';
import { HumanInboxService } from '../../services/human-inbox.service';
import { GetConnectCodeStatusCommand } from './get-connect-code-status.command';

/**
 * What became of one of the relay agent's one-time codes: unused, used by a host, or expired. The dashboard
 * asks while it shows the code, as a host that comes in the way another one already did looks like that one
 * checking in (`hosts`), while its code tells it apart. Only the agent's own codes are told about: any other
 * is a 404, the same as one that was never made.
 */
@Injectable()
export class GetConnectCodeStatus {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly connectCodes: HumanConnectCodeService,
    private readonly environmentRepository: EnvironmentRepository
  ) {}

  async execute(command: GetConnectCodeStatusCommand): Promise<ConnectCodeStatusResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const [agent, environment] = await Promise.all([
      this.inbox.resolveRelayAgent(scope, command.agentIdentifier),
      this.environmentRepository.findOne(
        { _id: scope.environmentId, _organizationId: scope.organizationId },
        'apiKeys'
      ),
    ]);
    if (!environment) {
      throw new NotFoundException('This environment no longer exists.');
    }

    const state = await this.connectCodes.describe(
      // A code made with a key that was replaced since reads as expired, as `connect` would find it.
      { ...scope, agentId: agent._id, keyFingerprint: keyFingerprint(environment.apiKeys?.[0]) },
      command.handle,
      command.code
    );
    if (!state) {
      throw new NotFoundException({
        message: 'This agent has no such code. Codes are let go an hour after they are made.',
        code: CONNECT_CODE_INVALID,
      });
    }

    return state;
  }
}
