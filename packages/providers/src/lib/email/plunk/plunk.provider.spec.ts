import { expect, test, vi } from 'vitest';
import { PlunkEmailProvider } from './plunk.provider';

const mockConfig = {
  apiKey: 'sample-api-key',
  senderName: "Novu's Team",
};

const mockNovuMessage = {
  from: 'test@nomail.com',
  to: ['test@nomail.com'],
  html: '<div> Mail Content </div>',
  subject: 'Test subject',
};

test('should trigger plunk library correctly', async () => {
  const provider = new PlunkEmailProvider(mockConfig);
  const spy = vi.spyOn(provider, 'sendMessage').mockImplementation(async () => {
    return {};
  });

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toBeCalled();
  expect(spy).toBeCalledWith({
    from: mockNovuMessage.from,
    to: mockNovuMessage.to,
    html: mockNovuMessage.html,
    subject: mockNovuMessage.subject,
  });
});
