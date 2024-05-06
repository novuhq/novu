// Mock the external modules
import { PlivoSmsProvider } from './plivo.provider';

const createMock = jest.fn().mockResolvedValue({ messageUuid: 'mockedUUID' });

jest.mock('plivo', () => ({
  Client: jest.fn().mockImplementation(() => ({
    messages: {
      create: createMock,
    },
  })),
}));

describe('PlivoSmsProvider', () => {
  test('should trigger plivo correctly', async () => {
    const provider = new PlivoSmsProvider({
      accountSid: '<plivo-id>',
      authToken: '<plivo-token>',
      from: '+1145678',
    });

    await provider.sendMessage({
      to: '+187654',
      content: 'Test',
    });

    expect(createMock).toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledWith('+1145678', '+187654', 'Test');
  });
});
