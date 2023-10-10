import { ClicksendSmsProvider } from './clicksend.provider';

describe('ClicksendSMSProvider', () => {
  let provider: ClicksendSmsProvider;

  beforeEach(() => {
    provider = new ClicksendSmsProvider({
      username: 'parvesh@novu.com',
      apiKey: '51A8AAF4-88C1-4391-53EC-BFB711CF7AF0',
    });
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should return a response with an id and date', async () => {
      const response = await provider.sendMessage({
        to: '+0451111111',
        content: 'test message',
      });

      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('date');
    });
  });
});
