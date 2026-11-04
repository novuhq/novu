import { Controller, HttpException, Post, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PinoLogger } from '@novu/application-generic';
import type { Request, Response } from 'express';
import type { ChatCompletionRequest } from '../agents/channels/voice/openai-sse';
import { sseDone } from '../agents/channels/voice/openai-sse';
import { verifyVoiceBridgeBearer } from '../agents/channels/voice/voice-bridge-config';
import { VoiceBridgeCompletions } from './usecases/voice-bridge-completions/voice-bridge-completions.usecase';

/**
 * OpenAI-shaped SSE endpoint ElevenLabs hits on every turn. Auth is the
 * shared bridge secret only. Stays out of OpenAPI.
 */
@Controller('human/voice')
@ApiExcludeController()
export class VoiceBridgeController {
  constructor(
    private readonly voiceBridgeCompletions: VoiceBridgeCompletions,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @Post('chat/completions')
  async completions(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!verifyVoiceBridgeBearer(req.header('authorization') ?? undefined)) {
      res.status(401).json({ error: 'Unauthorized' });

      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const abort = new AbortController();
    // `req` closes when the JSON body is consumed. The stream stays open until ElevenLabs drops it.
    res.on('close', () => {
      if (!res.writableEnded) {
        abort.abort();
      }
    });

    try {
      await this.voiceBridgeCompletions.execute({
        body: req.body as ChatCompletionRequest,
        res,
        signal: abort.signal,
      });
    } catch (error) {
      if (res.writableEnded) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Voice bridge failed';
      const status = error instanceof HttpException ? error.getStatus() : 500;
      this.logger.warn({ err: error, status }, 'Voice bridge turn failed');

      res.write(`data: ${JSON.stringify({ error: { message, status } })}\n\n`);
      res.write(sseDone());
      res.end();
    }
  }
}
