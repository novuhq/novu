import { ISmsOptions } from '@novu/stateless';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { SfrSmsProvider } from './sfr-sms.provider';

const mockConfig = {
  serviceId: '777777',
  servicePassword: '12345678',
  spaceId: '382',
  from: 'MyCompany',
};

const mockNovuMessage: ISmsOptions = {
  to: '+33623456789',
  content: 'SMS content',
};

// axiosSpy renvoie `data` tel quel comme réponse axios : on l'enveloppe donc dans `data`
const successResponse = (response: number | string = 26441597) => ({ data: { success: true, response } });

const getMessageUnitaire = (fakeGet: ReturnType<typeof vi.fn>) => {
  const { params } = fakeGet.mock.calls[0][1];

  return JSON.parse(params.messageUnitaire);
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sendMessage method', () => {
  test('should call SFR addSingleCall endpoint once with GET method', async () => {
    const { mockGet: fakeGet } = axiosSpy({ data: successResponse() });
    const provider = new SfrSmsProvider(mockConfig);

    await provider.sendMessage(mockNovuMessage);

    expect(fakeGet).toHaveBeenCalledTimes(1);
  });

  test('should call SFR endpoint with right URL', async () => {
    const { mockGet: fakeGet } = axiosSpy({ data: successResponse() });
    const provider = new SfrSmsProvider(mockConfig);

    await provider.sendMessage(mockNovuMessage);

    expect(fakeGet.mock.calls[0][0]).toEqual(
      'https://www.dmc.sfr-sh.fr/DmcWS/1.6.0/JsonService/MessagesUnitairesWS/addSingleCall'
    );
  });

  test('should send authenticate and messageUnitaire query parameters', async () => {
    const { mockGet: fakeGet } = axiosSpy({ data: successResponse() });
    const provider = new SfrSmsProvider(mockConfig);

    await provider.sendMessage(mockNovuMessage);

    const { params } = fakeGet.mock.calls[0][1];
    expect(JSON.parse(params.authenticate)).toEqual({
      serviceId: mockConfig.serviceId,
      servicePassword: mockConfig.servicePassword,
      spaceId: mockConfig.spaceId,
    });
    expect(getMessageUnitaire(fakeGet)).toEqual({
      media: 'SMS',
      textMsg: mockNovuMessage.content,
      from: mockConfig.from,
      to: mockNovuMessage.to,
    });
  });

  test('should use from option over configured from', async () => {
    const { mockGet: fakeGet } = axiosSpy({ data: successResponse() });
    const provider = new SfrSmsProvider(mockConfig);

    await provider.sendMessage({ ...mockNovuMessage, from: 'Other' });

    expect(getMessageUnitaire(fakeGet).from).toEqual('Other');
  });

  test.each([
    ['a'.repeat(160), 'SMS'],
    ['a'.repeat(161), 'SMSLong'],
    ['Bonjour à tous, très bien 5€', 'SMS'],
    ['Bonjour ça va ?', 'SMSUnicode'],
    ['Bonjour 😀', 'SMSUnicode'],
    ['😀'.repeat(71), 'SMSUnicodeLong'],
  ])('should pick the right media for content %#', async (content, expectedMedia) => {
    const { mockGet: fakeGet } = axiosSpy({ data: successResponse() });
    const provider = new SfrSmsProvider(mockConfig);

    await provider.sendMessage({ ...mockNovuMessage, content });

    expect(getMessageUnitaire(fakeGet).media).toEqual(expectedMedia);
  });

  test('should return id parsed from response', async () => {
    axiosSpy({ data: successResponse(26441597) });
    const provider = new SfrSmsProvider(mockConfig);

    const result = await provider.sendMessage(mockNovuMessage);

    expect(result.id).toEqual('26441597');
  });

  test('should throw when SFR responds with success false', async () => {
    axiosSpy({
      data: { data: { success: false, errorCode: 'AUTHENTICATION_FAILED', errorDetail: 'Authentification échouée' } },
    });
    const provider = new SfrSmsProvider(mockConfig);

    await expect(provider.sendMessage(mockNovuMessage)).rejects.toThrow('SFR SMS: Authentification échouée');
  });
});
