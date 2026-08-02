import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ApiAuthSchemeEnum,
  NotifyWorkflowAgentDispatchResponseDto,
  WorkflowAgentDispatchStatusEnum,
} from '@novu/shared';
import { PinoLogger } from '../../logging';
import { HttpClientError, HttpClientService } from '../../services/http-client';
import {
  NotifyWorkflowAgentDispatchClientCommand,
  toNotifyWorkflowAgentDispatchRequestBody,
} from './notify-workflow-agent-dispatch.command';

type ApiEnvelope<T> = { data: T };

@Injectable()
export class NotifyWorkflowAgentDispatchClient {
  constructor(
    private readonly httpClientService: HttpClientService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: NotifyWorkflowAgentDispatchClientCommand): Promise<NotifyWorkflowAgentDispatchResponseDto> {
    const apiBaseUrl = process.env.API_ROOT_URL;

    if (!apiBaseUrl) {
      throw new BadRequestException(
        'API_ROOT_URL environment variable is not set — cannot dispatch workflow agent message'
      );
    }

    const url = `${apiBaseUrl.replace(/\/$/, '')}/v1/agents/${encodeURIComponent(command.agentId)}/workflow-dispatch`;
    const body = toNotifyWorkflowAgentDispatchRequestBody(command);

    try {
      const response = await this.httpClientService.request<ApiEnvelope<NotifyWorkflowAgentDispatchResponseDto>>({
        url,
        method: 'POST',
        body,
        headers: {
          authorization: `${ApiAuthSchemeEnum.API_KEY} ${command.apiKey}`,
          'content-type': 'application/json',
        },
        timeout: 30_000,
        responseType: 'json',
        retry: { limit: 0 },
      });

      const payload = response.body?.data;

      if (!payload?.dispatchId || !payload.platformMessageId || !payload.platformThreadId) {
        throw new BadRequestException('Workflow agent dispatch API returned an incomplete response');
      }

      return {
        dispatchId: payload.dispatchId,
        platformMessageId: payload.platformMessageId,
        platformThreadId: payload.platformThreadId,
        status: payload.status ?? WorkflowAgentDispatchStatusEnum.SENT,
      };
    } catch (error) {
      if (error instanceof HttpClientError) {
        this.logger.error(
          {
            err: error,
            statusCode: error.statusCode,
            agentId: command.agentId,
            idempotencyKey: command.idempotencyKey,
          },
          'Workflow agent dispatch HTTP call failed'
        );
      }

      throw error;
    }
  }
}
