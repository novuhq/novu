import { expect, test, vi, describe, beforeEach } from 'vitest';
// Mock the external modules
import { PlivoSmsProvider } from './plivo.provider';

const createMock = vi.fn().mockResolvedValue({ messageUuid: 'mockedUUID' });

vi.mock(import('plivo'), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    Client: vi.fn().mockImplementation(() => ({
      messages: {
        create: createMock,
      },
    })),
  };
});

describe('PlivoSmsProvider', () => {
  beforeEach(() => {
    createMock.mockClear();
  });

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
    expect(createMock).toHaveBeenCalledWith(
      '+1145678',
      '+187654',
      'Test',
      undefined,
      undefined,
    );
  });

  test('should trigger plivo correctly with _passthrough', async () => {
    const provider = new PlivoSmsProvider({
      accountSid: '<plivo-id>',
      authToken: '<plivo-token>',
      from: '+1145678',
    });

    await provider.sendMessage(
      {
        to: '+187654',
        content: 'Test',
      },
      {
        _passthrough: {
          body: {
            dst: '+287654',
          },
        },
      },
    );

    expect(createMock).toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledWith(
      '+1145678',
      '+287654',
      'Test',
      undefined,
      undefined,
    );
  });
});
