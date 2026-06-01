import { BadGatewayException } from '@nestjs/common';
import type { SentMessageInfo } from '@novu/framework';
import { WebClient } from '@slack/web-api';
import type {
  ChannelAndBlocks,
  ChatPostMessageArguments,
  ChatUpdateArguments,
} from '@slack/web-api/dist/types/request/chat';

export type SlackNativeDelivery = Required<Omit<ChannelAndBlocks, 'channel'>>;

function decodeSlackPlatformThreadId(platformThreadId: string): { channel: string; threadTs?: string } {
  const parts = platformThreadId.split(':');
  if (parts[0] !== 'slack' || !parts[1]) {
    throw new Error(`Invalid Slack platform thread id: ${platformThreadId}`);
  }

  const threadTs = parts[2]?.trim();

  return { channel: parts[1], threadTs: threadTs || undefined };
}

export function getSlackApiErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') {
    return undefined;
  }

  const error = (err as { data?: { error?: string } }).data?.error;

  return typeof error === 'string' ? error : undefined;
}

function createSlackWebClient(token: string): WebClient {
  return new WebClient(token, {
    ...(process.env.SLACK_API_URL ? { slackApiUrl: process.env.SLACK_API_URL } : {}),
  });
}

export async function postSlackNativeBlocks(params: {
  botToken: string;
  platformThreadId: string;
  slackNative: SlackNativeDelivery;
}): Promise<SentMessageInfo> {
  const { channel, threadTs } = decodeSlackPlatformThreadId(params.platformThreadId);
  const client = createSlackWebClient(params.botToken);

  const result = await client.chat.postMessage({
    channel,
    ...params.slackNative,
    ...(threadTs ? { thread_ts: threadTs } : {}),
  } satisfies ChatPostMessageArguments);

  if (!result.ok || !result.ts) {
    throw new BadGatewayException({
      error: 'delivery_failed',
      message: result.error ?? 'Slack chat.postMessage failed',
    });
  }

  return { messageId: result.ts, platformThreadId: params.platformThreadId };
}

export async function editSlackNativeBlocks(params: {
  botToken: string;
  platformThreadId: string;
  platformMessageId: string;
  slackNative: SlackNativeDelivery;
}): Promise<SentMessageInfo> {
  const { channel } = decodeSlackPlatformThreadId(params.platformThreadId);
  const client = createSlackWebClient(params.botToken);

  const result = await client.chat.update({
    channel,
    ts: params.platformMessageId,
    ...params.slackNative,
  } satisfies ChatUpdateArguments);

  if (!result.ok || !result.ts) {
    throw new BadGatewayException({
      error: 'delivery_failed',
      message: result.error ?? 'Slack chat.update failed',
    });
  }

  return { messageId: result.ts, platformThreadId: params.platformThreadId };
}
