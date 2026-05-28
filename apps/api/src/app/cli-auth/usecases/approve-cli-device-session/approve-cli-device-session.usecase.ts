import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { decryptApiKey } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';

import {
  CliDeviceSessionNotFoundError,
  CliDeviceSessionService,
} from '../../services/cli-device-session.service';
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

    await this.assertApiKeyBelongsToEnvironment(environment._id, command.apiKey);

    try {
      await this.cliDeviceSessionService.approve({
        deviceCode: command.deviceCode,
        approvedByUserId: command.userId,
        apiKey: command.apiKey,
        environmentId: environment._id,
        environmentSlug: environment.identifier ?? null,
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

  private async assertApiKeyBelongsToEnvironment(environmentId: string, apiKey: string): Promise<void> {
    const keys = await this.environmentRepository.getApiKeys(environmentId);
    const hashedApiKey = createHash('sha256').update(apiKey).digest('hex');
    const isValid = keys.some((key) => key.hash === hashedApiKey || decryptApiKey(key.key as string) === apiKey);

    if (!isValid) {
      throw new BadRequestException('Invalid API key for the selected environment');
    }
  }
}
