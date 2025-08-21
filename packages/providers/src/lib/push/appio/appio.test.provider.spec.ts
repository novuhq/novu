import { expect, describe, it } from 'vitest';
import { AppioPushProvider } from './appio.provider';

describe('AppioPushProvider', () => {
  const provider = new AppioPushProvider({ AppIOBaseUrl: 'https://api.io.italia.it/api/v1' });

  it('should throw error if no API key provided', async () => {
    await expect(
      provider.sendMessage(
        {
          title: 'Test',
          content: 'Messaggio **test**',
          payload: {
            fiscalCode: 'RSSMRA80A01H501U',
          },
        } as any,
        {}
      )
    ).rejects.toThrow('Missing App IO API key');
  });
});
