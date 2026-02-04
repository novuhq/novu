import { describe, expect, test, vi } from 'vitest';
import { TextLkSmsProvider } from './textlk.provider';

const mockPost = vi.fn();

vi.mock('axios', () => ({
  default: {
    post: (...args: any[]) => {
      mockPost(...args);
      return Promise.resolve({
        data: {
          uid: 'mock-uid-123',
          status: 'success'
        }
      });
    }
  }
}));

describe('TextLkSmsProvider', () => {
  test('should trigger textlk API correctly', async () => {
    const provider = new TextLkSmsProvider({
      apiKey: 'test-api-key',
    });

    const result = await provider.sendMessage({
      to: '+94771234567',
      content: 'Hello World',
      from: 'MyCompany'
    });

    expect(mockPost).toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith(
      'https://app.text.lk/api/v3/sms/send',
      {
        recipient: '+94771234567',
        sender_id: 'MyCompany',
        type: 'plain',
        message: 'Hello World',
      },
      {
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    expect(result).toEqual({
      id: 'mock-uid-123',
      date: expect.any(String),
    });
  });
});
