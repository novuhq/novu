import {
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { ApiAuthSchemeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import type { Request, Response } from 'express';
import { AuthService } from '../../auth/services/auth.service';
import { getRequestHeaderValue } from '../../shared/helpers/get-request-header-value';
import { IngestAgentEventsCommand } from '../shared/ingest-agent-events/ingest-agent-events.command';
import { IngestAgentEvents } from '../shared/ingest-agent-events/ingest-agent-events.usecase';

@Injectable()
export class SdkAgentEventsHandler {
  constructor(
    private readonly authService: AuthService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly ingestAgentEvents: IngestAgentEvents
  ) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const user = await this.resolveApiKeyUser(req);
      await this.assertKillSwitchDisabled(user.organizationId, user.environmentId);
      await this.assertProtocolEnabled(user.organizationId, user.environmentId);

      const body = req.body as { events?: Record<string, unknown>[] } | undefined;
      const events = body?.events;

      if (!Array.isArray(events) || events.length === 0) {
        res.status(400).json({ message: 'events must be a non-empty array' });

        return;
      }

      const result = await this.ingestAgentEvents.execute(
        IngestAgentEventsCommand.create({
          userId: user._id,
          environmentId: user.environmentId,
          organizationId: user.organizationId,
          events,
        })
      );

      res.status(200).json({ data: result });
    } catch (error) {
      if (error instanceof HttpException) {
        const status = error.getStatus();
        const response = error.getResponse();
        res.status(status).json(typeof response === 'string' ? { message: response } : response);

        return;
      }

      throw error;
    }
  }

  private async resolveApiKeyUser(req: Request) {
    const authHeader = getRequestHeaderValue(req.headers.authorization);

    if (!authHeader?.startsWith(`${ApiAuthSchemeEnum.API_KEY} `)) {
      throw new UnauthorizedException('Authorization header is missing or invalid');
    }

    const apiKey = authHeader.slice(`${ApiAuthSchemeEnum.API_KEY} `.length).trim();

    if (!apiKey) {
      throw new UnauthorizedException('Authorization header is missing or invalid');
    }

    try {
      return await this.authService.getUserByApiKey(apiKey);
    } catch {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private async assertKillSwitchDisabled(organizationId: string, environmentId: string): Promise<void> {
    const isKillSwitchEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_ORG_KILLSWITCH_FLAG_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
      environment: { _id: environmentId },
      component: 'api',
    });

    if (isKillSwitchEnabled) {
      throw new ServiceUnavailableException('Service temporarily unavailable for this organization');
    }
  }

  private async assertProtocolEnabled(organizationId: string, environmentId: string): Promise<void> {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AGENT_EVENT_PROTOCOL_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
      environment: { _id: environmentId },
    });

    if (!isEnabled) {
      throw new NotFoundException();
    }
  }
}
