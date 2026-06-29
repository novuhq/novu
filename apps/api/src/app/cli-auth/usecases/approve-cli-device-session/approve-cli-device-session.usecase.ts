import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { buildSlug, shortenEnvironmentName } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { ShortIsPrefixEnum } from '@novu/shared';

import { CliDeviceSessionNotFoundError, CliDeviceSessionService } from '../../services/cli-device-session.service';
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

    const hashedApiKey = createHash('sha256').update(command.apiKey).digest('hex');
    const keyEnvironment = await this.environmentRepository.findByApiKey({ hash: hashedApiKey });

    if (!keyEnvironment || keyEnvironment._id !== environment._id) {
      throw new BadRequestException('Invalid API key for the selected environment');
    }

    try {
      await this.cliDeviceSessionService.approve({
        deviceCode: command.deviceCode,
        approvedByUserId: command.userId,
        apiKey: command.apiKey,
        environmentId: environment._id,
        environmentSlug: buildSlug(
          shortenEnvironmentName(environment.name),
          ShortIsPrefixEnum.ENVIRONMENT,
          environment._id
        ),
        environmentName: environment.name ?? null,
        organizationId: environment._organizationId,
        user: {
          id: command.userId,
          email: command.userEmail ?? null,
          firstName: command.userFirstName ?? null,
          lastName: command.userLastName ?? null,
        },
      });
    } catch (error) {
      if (error instanceof CliDeviceSessionNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }

    return { ok: true };
  }
}
