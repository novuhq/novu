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
  test('should trigger textlk API correctly with timeout', async () => {
    const provider = new TextLkSmsProvider({
      apiKey: 'test-api-key',
    });

    const result = await provider.sendMessage({
      to: '+94771234567',
      content: 'Hello World',
      from: 'MyCompany'
    });

    expect(mockPost).toHaveBeenCalled();
    
    // Check that axios was called with the correct URL, Body, and Config (timeout)
    expect(mockPost).toHaveBeenCalledWith(
      'https://app.text.lk/api/v3/sms/send',
      expect.objectContaining({
        recipient: expect.stringContaining('94771234567'), 
        message: 'Hello World',
      }),
      expect.objectContaining({
        timeout: 30000, // <--- This matches the new bot code
        headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
        })
      })
    );

    expect(result).toEqual({
      id: 'mock-uid-123',
      date: expect.any(String),
    });
  });
});
