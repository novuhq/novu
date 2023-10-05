import { HashmailEmailProvider } from './hashmail.provider';

const mockConfig = {
  apiKey:
    // eslint-disable-next-line max-len
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiIDogImF1dGhlbnRpY2F0ZWQiLCAiZXhwIiA6IDE3Mjc3Njc0MTYuNzcxMTcwLCAic3ViIiA6ICIzMDA5MjhkNS1jMzZjLTRjYjYtOTMxYS1mYzMwMTViNTdkOGIiLCAicm9sZSIgOiAiYXV0aGVudGljYXRlZCIsICJkZXNjcmlwdGlvbiIgOiAiZGVmYXVsdCIsICJpc3MiIDogImNvbnNvbGUuaGFzaG1haWwuZGV2In0.9POGd1vGHHcFCmMwE3CjMRjISLOjVs-RU0Foejoemeo',
  from: 'bibaswanprasai12@gmail.com',
};

const mockNovuMessage = {
  from: 'test@test.com',
  to: ['bibaswanprasai12@gmail.com'],
  html: '<div> Mail Content </div>',
  subject: 'Test subject',
  attachments: [
    {
      mime: 'text/plain',
      file: Buffer.from('test'),
      name: 'test.txt',
    },
  ],
};

test('should trigger hashmail library correctly', async () => {
  const provider = new HashmailEmailProvider(mockConfig);
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
    attachments: mockNovuMessage.attachments,
  });
});
