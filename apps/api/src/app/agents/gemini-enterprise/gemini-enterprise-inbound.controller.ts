import { Body, Controller, HttpException, HttpStatus, Param, Post, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { GeminiEnterpriseInboundService, type JsonRpcRequest } from './gemini-enterprise-inbound.service';

/**
 * A2A JSON-RPC endpoint Gemini Enterprise calls. Unauthenticated: the per-integration secret in the
 * path is the credential. Separate from the generic agent webhook because the reply must stream on
 * this response, which the buffered `handleWebhook` path cannot do.
 */
@Controller('/agents')
@ApiExcludeController()
export class GeminiEnterpriseInboundController {
  constructor(private readonly inbound: GeminiEnterpriseInboundService) {}

  @Post('/:agentId/gemini-enterprise/:integrationIdentifier/:secret')
  async handleMessage(
    @Param('agentId') agentId: string,
    @Param('integrationIdentifier') integrationIdentifier: string,
    @Param('secret') secret: string,
    @Body() rpc: JsonRpcRequest,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    let config: ResolvedAgentConfig;
    try {
      config = await this.inbound.authorize(agentId, integrationIdentifier, secret);
    } catch (err) {
      if (err instanceof HttpException) {
        res.status(HttpStatus.NOT_FOUND).json({});

        return;
      }
      throw err;
    }

    if (rpc?.method !== 'message/stream') {
      res.status(HttpStatus.OK).json({
        jsonrpc: '2.0',
        id: rpc?.id ?? null,
        error: { code: -32601, message: 'Method not found: only message/stream is supported' },
      });

      return;
    }

    await this.inbound.stream(config, rpc, req, res);
  }
}
