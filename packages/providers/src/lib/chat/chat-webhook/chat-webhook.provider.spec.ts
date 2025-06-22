import { ChatProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { ChatWebhookProvider } from './chat-webhook.provider';

describe('ChatWebhookProvider', () => {
  let provider: ChatWebhookProvider;
  const mockConfig = {
    webhookUrl: 'https://example.com/webhook',
    hmacSecretKey: 'test-secret-key',
  };

  beforeEach(() => {
    provider = new ChatWebhookProvider(mockConfig);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should have correct id and channel type', () => {
    expect(provider.id).toBe(ChatProviderIdEnum.ChatWebhook);
    expect(provider.channelType).toBe(ChannelTypeEnum.CHAT);
  });

  it('should create body correctly', () => {
    const testData = { content: 'Hello World', customData: { key: 'value' } };
    const body = provider.createBody(testData);

    expect(body).toBe(JSON.stringify(testData));
  });

  it('should compute HMAC correctly', () => {
    const payload = '{"content":"Hello World"}';
    const hmac = provider.computeHmac(payload);

    expect(hmac).toBeDefined();
    expect(typeof hmac).toBe('string');
    expect(hmac.length).toBe(64); // SHA256 hex string length
  });
});
