import { Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import type { Response } from 'express';
import { SendDocsMessageCommand } from './send-docs-message.command';

const MINTLIFY_DISCOVERY_BASE_URL = 'https://api.mintlify.com/discovery';

export type SendDocsMessageResponse = { handled: true } | { handled: false; body: unknown };

@Injectable()
export class SendDocsMessageUsecase {
  async execute(command: SendDocsMessageCommand, res: Response): Promise<SendDocsMessageResponse> {
    const apiKey = process.env.MINTLIFY_ASSISTANT_KEY;
    const domain = process.env.MINTLIFY_DOMAIN;

    if (!apiKey || !domain) {
      throw new ServiceUnavailableException('Docs assistant is not configured');
    }

    const upstream = await fetch(`${MINTLIFY_DISCOVERY_BASE_URL}/v2/assistant/${domain}/message`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        fp: command.fp,
        threadId: command.threadId,
        threadKey: command.threadKey,
        messages: command.messages,
        retrievalPageSize: command.retrievalPageSize ?? 5,
        currentPath: command.currentPath,
      }),
    });

    if (!upstream.ok) {
      const errorBody = await safeReadJson(upstream);

      throw new InternalServerErrorException(errorBody ?? { message: 'Mintlify assistant request failed' });
    }

    return this.pipeStream(upstream, res);
  }

  private async pipeStream(upstream: globalThis.Response, res: Response): Promise<SendDocsMessageResponse> {
    res.status(upstream.status);

    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') {
        return;
      }

      res.setHeader(key, value);
    });

    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    if (!upstream.body) {
      res.end();

      return { handled: true };
    }

    const reader = upstream.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (value) {
          res.write(value);
        }
      }
    } finally {
      reader.releaseLock();
    }

    res.end();

    return { handled: true };
  }
}

async function safeReadJson(response: globalThis.Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
