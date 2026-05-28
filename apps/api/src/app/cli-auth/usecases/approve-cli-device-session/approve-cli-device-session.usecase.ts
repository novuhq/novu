import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';

import { CliDeviceSessionService } from '../../services/cli-device-session.service';
import { ApproveCliDeviceSessionCommand } from './approve-cli-device-session.command';

@Injectable()
export class ApproveCliDeviceSession {
  constructor(
    private readonly cliDeviceSessionService: CliDeviceSessionService,
    private readonly environmentRepository: EnvironmentRepository
  ) {}

  async execute(command: ApproveCliDeviceSessionCommand): Promise<{ ok: true }> {
    const environment = await this.environmentRepository.findOne({
      _id: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!environment) {
      throw new NotFoundException('Environment not found');
    }

    if (
      command.environmentOrganizationId &&
      command.environmentOrganizationId !== command.organizationId
    ) {
      throw new ForbiddenException('Environment does not belong to your organization');
    }

    try {
      await this.cliDeviceSessionService.approve({
        deviceCode: command.deviceCode,
        approvedByUserId: command.userId,
        apiKey: command.apiKey,
        environmentId: command.environmentId,
        environmentSlug: command.environmentSlug ?? null,
        environmentName: command.environmentName ?? environment.name ?? null,
        organizationId: environment._organizationId,
        user: command.user ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to approve CLI device session';

      throw new NotFoundException(message);
    }

    return { ok: true };
  }
}
