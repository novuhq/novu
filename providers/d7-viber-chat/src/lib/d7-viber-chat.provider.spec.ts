import { D7ViberChatChatProvider } from './d7-viber-chat.provider';
import { apiKey } from './d7-viber-chat.provider';
describe('D7ViberChatChatProvider', () => {
  it('should send a Viber message correctly', async () => {
    const provider = new D7ViberChatChatProvider({
      apiKey,
      senderName: 'Firos',
    });
    const messageOptions = {
      recipient: 'SOME_RECIPIENT',
      content: 'Hello from D7 Viber Chat!',
      label: 'TEST_LABEL',
      webhookUrl: 'https://your-callback-url.com/viber-dlr',
    };
    const result = await provider.sendMessage(messageOptions);

    expect(result).toBeDefined();
  });
});
