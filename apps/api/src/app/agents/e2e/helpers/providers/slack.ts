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

/** Slack's `app_uninstalled` event_callback, as delivered after the app is removed from one workspace. */
export function buildSlackAppUninstalled(opts: { teamId: string }) {
  const eventTs = `${Date.now() / 1000}`;

  return {
    token: 'deprecated-token',
    team_id: opts.teamId,
    api_app_id: 'A_E2E',
    event: { type: 'app_uninstalled', event_ts: eventTs },
    type: 'event_callback',
    event_id: `Ev_uninstall_${eventTs}`,
    event_time: Math.floor(Date.now() / 1000),
    authorizations: [
      { enterprise_id: null, team_id: opts.teamId, user_id: 'UBOT', is_bot: true, is_enterprise_install: false },
    ],
    is_ext_shared_channel: false,
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
