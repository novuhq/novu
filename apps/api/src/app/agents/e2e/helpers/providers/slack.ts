import { createHmac } from 'crypto';

export function signSlackRequest(signingSecret: string, timestamp: number, body: string) {
  const sigBasestring = `v0:${timestamp}:${body}`;
  const signature = 'v0=' + createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');

  return { 'x-slack-signature': signature, 'x-slack-request-timestamp': String(timestamp) };
}

export function buildSlackChallenge(challenge = 'test-challenge-token') {
  return { type: 'url_verification', challenge, token: 'deprecated-token' };
}

export function buildSlackAppMention(opts: {
  userId: string;
  channel: string;
  threadTs: string;
  text?: string;
  eventTs?: string;
}) {
  const ts = opts.eventTs ?? `${Date.now() / 1000}`;

  return {
    type: 'event_callback',
    token: 'deprecated-token',
    team_id: 'T_TEAM',
    event: {
      type: 'app_mention',
      user: opts.userId,
      text: opts.text ?? `<@UBOT> help me`,
      ts,
      channel: opts.channel,
      thread_ts: opts.threadTs,
      event_ts: ts,
    },
    event_id: `Ev_${ts}`,
    event_time: Math.floor(Date.now() / 1000),
  };
}

export function buildSlackSubscribedMessage(opts: {
  userId: string;
  channel: string;
  threadTs: string;
  text?: string;
  eventTs?: string;
}) {
  const ts = opts.eventTs ?? `${Date.now() / 1000}`;

  return {
    type: 'event_callback',
    token: 'deprecated-token',
    team_id: 'T_TEAM',
    event: {
      type: 'message',
      user: opts.userId,
      text: opts.text ?? 'follow-up message',
      ts,
      channel: opts.channel,
      thread_ts: opts.threadTs,
      event_ts: ts,
    },
    event_id: `Ev_${ts}`,
    event_time: Math.floor(Date.now() / 1000),
  };
}
