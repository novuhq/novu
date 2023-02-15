import { ResendEmailProvider } from './resend.provider';

const mockConfig = {
  apiKey:
    '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',
  from: 'test@test.com',
};

const mockNovuMessage = {
  from: 'test@test.com',
  to: ['test@test.com'],
  html: '<div> Mail Content </div>',
  subject: 'Test subject',
};

test('should trigger resend library correctly', async () => {
  const provider = new ResendEmailProvider(mockConfig);
  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
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
