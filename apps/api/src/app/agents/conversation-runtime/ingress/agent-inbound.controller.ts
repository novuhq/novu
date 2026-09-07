import { Controller, Get, HttpCode, HttpException, HttpStatus, Param, Post, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PinoLogger } from '@novu/application-generic';
import { Request, Response } from 'express';
import type { AgentConfigResolveSource } from '../../channels/agent-config-resolver.service';
import { AgentInactiveException } from '../../shared/errors/agent-inactive.exception';
import { AgentIntegrationDisconnectedException } from '../../shared/errors/agent-integration-disconnected.exception';
import { InboundDispatcher } from './inbound.dispatcher';

@Controller('/agents')
@ApiExcludeController()
export class AgentInboundController {
  constructor(
    private inboundDispatcher: InboundDispatcher,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @Get('/:agentId/webhook/:integrationIdentifier')
  async handleWebhookVerification(
    @Param('agentId') agentId: string,
    @Param('integrationIdentifier') integrationIdentifier: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    return this.routeWebhook(agentId, integrationIdentifier, req, res, 'webhook_verification');
  }

  @Post('/:agentId/webhook/:integrationIdentifier')
  @HttpCode(HttpStatus.OK)
  async handleInboundWebhook(
    @Param('agentId') agentId: string,
    @Param('integrationIdentifier') integrationIdentifier: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    return this.routeWebhook(agentId, integrationIdentifier, req, res, 'webhook_message');
  }

  private async routeWebhook(
    agentId: string,
    integrationIdentifier: string,
    req: Request,
    res: Response,
    source: AgentConfigResolveSource
  ) {
    try {
      await this.inboundDispatcher.handleWebhook(agentId, integrationIdentifier, req, res, { source });
    } catch (err) {
      if (err instanceof AgentInactiveException || err instanceof AgentIntegrationDisconnectedException) {
        // Return 200 to avoid retries by the delivery provider
        res.status(HttpStatus.OK).json({});

        return;
      }

      if (err instanceof HttpException) {
        res.status(err.getStatus()).json(err.getResponse());
      } else {
        throw err;
      }
    }
  }
}
