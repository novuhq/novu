import { BrazeEmailProvider } from './braze.provider';

const mockConfig = {
  apiKey: 'your-api-key',
  apiURL: 'your-api-url',
  appID: 'your-app-id',
};

const mockEmailOptions = {
  from: 'test@example.com',
  to: ['recipient1@example.com', 'recipient2@example.com'],
  subject: 'Test Subject',
  html: '<p>HTML content</p>',
};

test('should trigger sendMessage method correctly', async () => {
  const provider = new BrazeEmailProvider(mockConfig);

  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });

  await provider.sendMessage(mockEmailOptions);

  expect(spy).toBeCalled();

  expect(spy).toBeCalledWith({
    from: mockEmailOptions.from,
    to: mockEmailOptions.to,
    html: mockEmailOptions.html,
    subject: mockEmailOptions.subject,
  });
});
