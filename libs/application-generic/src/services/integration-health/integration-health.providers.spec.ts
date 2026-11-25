/**
 * Per-provider check that a credential rejection on a send is recognised.
 *
 * Each case runs the real handler and provider SDK, with every HTTP call (node http/https and global fetch) answered
 * by the provider's rejection, then feeds the error the SDK actually threw to `classifyError`. A provider whose SDK
 * changes its error shape fails here instead of silently never turning its card red.
 *
 * SMTP and HTTP/2 can't be faked that way. emailjs runs through its handler against a local SMTP server that rejects
 * the login. Nodemailer and Outlook 365 refuse local hosts (SSRF guard) and APNs uses HTTP/2, so those use the error
 * their libraries threw against the real servers, recorded once.
 */
import { generateKeyPairSync } from 'node:crypto';
import { createServer, type Server } from 'node:net';
import { ChannelTypeEnum, ENDPOINT_TYPES, IntegrationHealthErrorCodeEnum } from '@novu/shared';
import nock from 'nock';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatFactory } from '../../factories/chat/chat.factory';
import { MailFactory } from '../../factories/mail/mail.factory';
import { PushFactory } from '../../factories/push/push.factory';
import { SmsFactory } from '../../factories/sms/sms.factory';
import { IntegrationHealthService } from './integration-health.service';

const { INVALID_CREDENTIALS, TOKEN_EXPIRED } = IntegrationHealthErrorCodeEnum;

type Reply = { status: number; body: string | object; headers?: Record<string, string> };

type ProviderCase = {
  channel: ChannelTypeEnum;
  providerId: string;
  /** What the provider answers. Defaults to a bare 401, so detection can't come from matching a message. */
  reply?: Reply;
  credentials?: Record<string, unknown>;
  expected: IntegrationHealthErrorCodeEnum | undefined;
};

const BARE_401: Reply = { status: 401, body: { message: 'Unauthorized' } };

const { privateKey: SERVICE_ACCOUNT_KEY } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const BASE_CREDENTIALS: Record<string, unknown> = {
  apiKey: 'key-fake-123456789',
  secretKey: 'secret-fake-123',
  apiToken: '123456:FAKE-token',
  token: 'fake-token-123',
  user: 'fake-user',
  password: 'fake-pass',
  domain: 'example.com',
  accountSid: `AC${'a'.repeat(32)}`,
  from: '+15005550001',
  senderName: 'Tester',
  applicationId: 'app-123',
  clientId: 'client-123',
  projectName: 'proj',
  baseUrl: 'https://api.example.com',
  tenantId: 'tenant-123',
  instanceId: 'inst-123',
  phoneNumberIdentification: '1234567890',
  businessAccountId: 'ba-1',
  accessKey: 'access-123',
  appSid: 'appsid',
  senderId: 'sender',
  servicePlanId: 'plan-1',
  messageProfileId: 'mp-1',
  region: 'us-east-1',
  authenticateByToken: true,
  authenticationTokenKey: 'tk',
};

const SEND_OPTIONS: Partial<Record<ChannelTypeEnum, Record<string, unknown>>> = {
  [ChannelTypeEnum.EMAIL]: {
    to: ['user@example.com'],
    subject: 's',
    html: '<p>x</p>',
    text: 'x',
    from: 'sender@example.com',
    id: 'm1',
  },
  [ChannelTypeEnum.SMS]: { to: '+15005550006', content: 'x', from: '+15005550001', id: 'm1' },
  [ChannelTypeEnum.PUSH]: {
    target: ['device-token'],
    title: 't',
    content: 'c',
    payload: {},
    subscriber: {},
    step: { digest: false, events: [], total_count: 0 },
    overrides: {},
  },
};

const CHAT_ENDPOINTS: Record<string, { type: string; endpoint: Record<string, string> }> = {
  telegram: { type: ENDPOINT_TYPES.TELEGRAM_CHAT, endpoint: { chatId: '123' } },
  'whatsapp-business': { type: ENDPOINT_TYPES.PHONE, endpoint: { phoneNumber: '+15005550006' } },
  line: { type: ENDPOINT_TYPES.LINE_USER, endpoint: { userId: 'U123' } },
  msteams: { type: ENDPOINT_TYPES.MS_TEAMS_USER, endpoint: { userId: 'u-1' } },
};

const email = (providerId: string, extra: Partial<ProviderCase> = {}): ProviderCase => ({
  channel: ChannelTypeEnum.EMAIL,
  providerId,
  expected: INVALID_CREDENTIALS,
  ...extra,
});
const sms = (providerId: string, extra: Partial<ProviderCase> = {}): ProviderCase => ({
  channel: ChannelTypeEnum.SMS,
  providerId,
  expected: INVALID_CREDENTIALS,
  ...extra,
});
const push = (providerId: string, extra: Partial<ProviderCase> = {}): ProviderCase => ({
  channel: ChannelTypeEnum.PUSH,
  providerId,
  expected: INVALID_CREDENTIALS,
  ...extra,
});
const chat = (providerId: string, extra: Partial<ProviderCase> = {}): ProviderCase => ({
  channel: ChannelTypeEnum.CHAT,
  providerId,
  expected: INVALID_CREDENTIALS,
  ...extra,
});

/** Providers whose send error carries the rejection, so a bad key turns the integration to Error. */
const DETECTED: ProviderCase[] = [
  email('sendgrid'),
  email('mailgun'),
  email('netcore'),
  email('mailjet'),
  email('postmark'),
  email('sendinblue'),
  email('sparkpost'),
  email('anypost'),
  email('mailtrap'),
  // Rejects with `{ statusCode, body }`, which carries the 401.
  email('mailersend'),
  email('braze', { credentials: { apiURL: 'https://rest.iad-01.braze.com', appID: 'app' } }),
  email('ses'),
  email('ses', {
    // What SES actually answers for an unknown access key.
    reply: {
      status: 403,
      body: { message: 'The security token included in the request is invalid.' },
      headers: { 'x-amzn-errortype': 'UnrecognizedClientException' },
    },
  }),
  email('resend', {
    reply: { status: 403, body: { statusCode: 403, message: 'API key is invalid', name: 'invalid_api_key' } },
  }),
  sms('twilio', { credentials: { region: undefined } }),
  sms('nexmo'),
  sms('plivo'),
  sms('sinch', { credentials: { region: 'us' } }),
  sms('clickatell'),
  sms('gupshup'),
  sms('imedia'),
  sms('burst-sms'),
  sms('forty-six-elks'),
  sms('kannel', { credentials: { host: 'sms.example.com', port: '13013' } }),
  sms('maqsam'),
  sms('sms-central'),
  sms('africas-talking'),
  sms('sendchamp'),
  sms('clicksend'),
  sms('simpletexting'),
  sms('bandwidth'),
  sms('isend-sms'),
  sms('ring-central'),
  sms('eazy-sms'),
  sms('mobishastra'),
  sms('afro-message'),
  sms('unifonic'),
  sms('smsmode'),
  sms('bulk-sms'),
  sms('isendpro-sms'),
  sms('cm-telecom'),
  sms('ruach-sms'),
  sms('sns', {
    // SNS speaks the AWS query protocol, so its rejection is XML.
    reply: {
      status: 403,
      body: `<ErrorResponse><Error><Type>Sender</Type><Code>InvalidClientTokenId</Code><Message>The security token included in the request is invalid.</Message></Error><RequestId>1</RequestId></ErrorResponse>`,
      headers: { 'content-type': 'text/xml' },
    },
  }),
  sms('brevo-sms', { reply: { status: 401, body: { code: 'unauthorized', message: 'Key not found' } } }),
  push('expo'),
  push('one-signal'),
  push('pushpad'),
  push('pusher-beams'),
  push('fcm', {
    credentials: {
      serviceAccount: JSON.stringify({
        type: 'service_account',
        project_id: 'proj',
        private_key_id: 'k1',
        private_key: SERVICE_ACCOUNT_KEY,
        client_email: 'sa@proj.iam.gserviceaccount.com',
        client_id: '1',
        token_uri: 'https://oauth2.googleapis.com/token',
      }),
    },
    // Google's token endpoint for a deleted or wrong service account key.
    reply: { status: 400, body: { error: 'invalid_grant', error_description: 'Invalid JWT Signature.' } },
  }),
  chat('telegram', { reply: { status: 401, body: { ok: false, error_code: 401, description: 'Unauthorized' } } }),
  chat('whatsapp-business', {
    reply: {
      status: 401,
      body: { error: { message: 'Invalid OAuth access token.', type: 'OAuthException', code: 190 } },
    },
  }),
  chat('line'),
  chat('msteams'),
];

/**
 * Providers whose SDK loses the rejection, so a bad key on a send can't be told apart from any other failure.
 * Test connection still covers them where it has a check. Fixing one means changing its provider in
 * packages/providers to keep the HTTP status; when that happens, this test fails and the case moves up.
 */
const NOT_DETECTED: ProviderCase[] = [
  // Read the response body before checking the status, and crash with a TypeError.
  email('mandrill', { expected: undefined }),
  email('infobip-email', { expected: undefined, credentials: { baseUrl: 'https://xyz.api.infobip.com' } }),
  sms('infobip-sms', { expected: undefined, credentials: { baseUrl: 'https://xyz.api.infobip.com' } }),
  sms('telnyx', { expected: undefined }),
  sms('sms77', { expected: undefined }),
  // Map every non-2xx answer to a generic "Unknown status code" error.
  sms('firetext', { expected: undefined }),
];

/** Providers that don't throw on a rejected send at all, so there's nothing to classify. */
const NEVER_THROW = ['termii', 'messagebird'];

function factoryFor(channel: ChannelTypeEnum) {
  switch (channel) {
    case ChannelTypeEnum.EMAIL:
      return new MailFactory();
    case ChannelTypeEnum.SMS:
      return new SmsFactory();
    case ChannelTypeEnum.PUSH:
      return new PushFactory();
    default:
      return new ChatFactory();
  }
}

function fakeHttp(reply: Reply) {
  nock.cleanAll();
  const body = typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body);
  const headers = { 'content-type': 'application/json', ...reply.headers };

  for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
    nock(/.*/).persist()[method](/.*/).reply(reply.status, body, headers);
  }

  vi.stubGlobal('fetch', async () => new Response(body, { status: reply.status, headers }));
}

async function sendAndCatch({ channel, providerId, credentials }: ProviderCase): Promise<unknown> {
  const integration = {
    providerId,
    channel,
    credentials: { ...BASE_CREDENTIALS, ...credentials },
    configurations: {},
  } as never;
  const factory = factoryFor(channel);
  const handler =
    channel === ChannelTypeEnum.EMAIL
      ? (factory as MailFactory).getHandler(integration, 'sender@example.com')
      : factory.getHandler(integration);

  if (!handler) throw new Error(`No handler for ${providerId}`);

  const options =
    channel === ChannelTypeEnum.CHAT
      ? { channelData: CHAT_ENDPOINTS[providerId], content: 'x' }
      : SEND_OPTIONS[channel];

  try {
    await (handler as { send: (options: unknown) => Promise<unknown> }).send(options);
  } catch (error) {
    return error;
  }

  return undefined;
}

describe('IntegrationHealthService.classifyError, per provider', () => {
  beforeAll(() => {
    nock.disableNetConnect();
    // Handlers refuse to send under NODE_ENV=test so tests never reach a real provider. Here every HTTP call is
    // faked (nock + stubbed fetch, real network refused), and only providers that send over HTTP run a real send.
    vi.stubEnv('NODE_ENV', 'development');
  });

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe('marks the integration as Error when the provider rejects the credentials', () => {
    it.each(DETECTED.map((item) => [`${item.channel}:${item.providerId}`, item] as const))('%s', async (_, item) => {
      fakeHttp(item.reply ?? BARE_401);

      const error = await sendAndCatch(item);

      expect(error, 'the send should fail').toBeDefined();
      expect(IntegrationHealthService.classifyError(error)).toBe(item.expected);
    });
  });

  describe('cannot tell a rejection apart (the SDK drops the status)', () => {
    it.each(NOT_DETECTED.map((item) => [`${item.channel}:${item.providerId}`, item] as const))(
      '%s',
      async (_, item) => {
        fakeHttp(BARE_401);

        const error = await sendAndCatch(item);

        expect(error, 'the send should fail').toBeDefined();
        expect(IntegrationHealthService.classifyError(error)).toBeUndefined();
      }
    );
  });

  it.each(NEVER_THROW)('sms:%s does not throw on a rejected send', async (providerId) => {
    fakeHttp(BARE_401);

    expect(await sendAndCatch(sms(providerId))).toBeUndefined();
  });

  describe('outside plain HTTP', () => {
    let smtpServer: Server;
    let smtpPort: number;

    beforeAll(async () => {
      // Accepts the connection and rejects any login the way Exchange / Outlook 365 does.
      smtpServer = createServer((socket) => {
        socket.write('220 localhost ESMTP\r\n');
        socket.on('data', (chunk) => {
          const line = chunk.toString();
          if (/^(EHLO|HELO)/i.test(line)) socket.write('250-localhost\r\n250 AUTH LOGIN PLAIN\r\n');
          else if (/^AUTH/i.test(line)) socket.write('535 5.7.3 Authentication unsuccessful\r\n');
          else if (/^QUIT/i.test(line)) socket.end('221 bye\r\n');
          else socket.write('250 OK\r\n');
        });
      });
      await new Promise<void>((resolve) => smtpServer.listen(0, '127.0.0.1', resolve));
      smtpPort = (smtpServer.address() as { port: number }).port;
      nock.enableNetConnect('127.0.0.1');
    });

    afterAll(() => {
      smtpServer.close();
      nock.disableNetConnect();
    });

    it('smtp: emailjs rejects the login with AUTHFAILED', async () => {
      const error = await sendAndCatch(
        email('emailjs', { credentials: { host: '127.0.0.1', port: String(smtpPort), secure: false } })
      );

      expect(error, 'the send should fail').toBeDefined();
      expect(IntegrationHealthService.classifyError(error)).toBe(INVALID_CREDENTIALS);
    });

    it('smtp: Nodemailer and Outlook 365 reject the login with EAUTH', () => {
      // Recorded from Outlook 365 (smtp.office365.com) with a wrong password; Nodemailer throws the same shape.
      const error = Object.assign(new Error('Invalid login: 535 5.7.3 Authentication unsuccessful'), {
        code: 'EAUTH',
        responseCode: 535,
        command: 'AUTH LOGIN',
      });

      expect(IntegrationHealthService.classifyError(error)).toBe(INVALID_CREDENTIALS);
    });

    it('http/2: APNs answers a mismatched signing key with InvalidProviderToken', () => {
      // The error message the APNs provider throws for that answer.
      const error = new Error('device-token failed for reason: InvalidProviderToken');

      expect(IntegrationHealthService.classifyError(error)).toBe(INVALID_CREDENTIALS);
    });

    it('http/2: APNs answers an expired provider token with ExpiredProviderToken', () => {
      const error = new Error('device-token failed for reason: ExpiredProviderToken');

      expect(IntegrationHealthService.classifyError(error)).toBe(TOKEN_EXPIRED);
    });
  });
});
