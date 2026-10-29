import nock from 'nock';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { TwilioSmsProvider } from './twilio.provider';

const ACCOUNT_SID = 'AC00000000000000000000000000000001';
const AUTH_TOKEN = 'auth-token';
const API_KEY_SID = 'SK00000000000000000000000000000002';
const API_KEY_SECRET = 'api-key-secret';

function basicAuth(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function interceptMessageCreate(origin: string) {
  const request: { authorization?: string } = {};

  nock(origin)
    .post(`/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`)
    .reply(function () {
      request.authorization = this.req.headers.authorization;

      return [201, { sid: 'SM123', date_created: 'Wed, 28 Oct 2026 10:00:00 +0000' }];
    });

  return request;
}

beforeEach(() => {
  nock.disableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

test('sends with the auth token when no API key is configured', async () => {
  const request = interceptMessageCreate('https://api.twilio.com');
  const provider = new TwilioSmsProvider({ accountSid: ACCOUNT_SID, authToken: AUTH_TOKEN, from: '+15550000001' });

  const response = await provider.sendMessage({ to: '+15550000002', content: 'Hello' });

  expect(response.id).toBe('SM123');
  expect(request.authorization).toBe(basicAuth(ACCOUNT_SID, AUTH_TOKEN));
});

test('sends on behalf of the account with the API key instead of the auth token', async () => {
  const request = interceptMessageCreate('https://api.twilio.com');
  const provider = new TwilioSmsProvider({
    accountSid: ACCOUNT_SID,
    apiKeySid: API_KEY_SID,
    apiKeySecret: API_KEY_SECRET,
    from: '+15550000001',
  });

  const response = await provider.sendMessage({ to: '+15550000002', content: 'Hello' });

  expect(response.id).toBe('SM123');
  expect(request.authorization).toBe(basicAuth(API_KEY_SID, API_KEY_SECRET));
});

test('sends to the IE1 API with an API key when the region is EU', async () => {
  const request = interceptMessageCreate('https://api.dublin.ie1.twilio.com');
  const provider = new TwilioSmsProvider({
    accountSid: ACCOUNT_SID,
    apiKeySid: API_KEY_SID,
    apiKeySecret: API_KEY_SECRET,
    from: '+15550000001',
    region: 'eu',
  });

  await provider.sendMessage({ to: '+15550000002', content: 'Hello' });

  expect(request.authorization).toBe(basicAuth(API_KEY_SID, API_KEY_SECRET));
});
