import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SinchSmsProvider } from './sinch.provider';

vi.mock('axios');

describe('SinchSmsProvider', () => {
  const mockConfig = {
    servicePlanId: 'test-service-plan-id',
    apiToken: 'test-api-token',
    from: '+1234567890',
    region: 'eu',
  };

  let provider: SinchSmsProvider;

  beforeEach(() => {
    provider = new SinchSmsProvider(mockConfig);
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send an SMS message successfully', async () => {
      const mockResponse = {
        data: {
          id: 'batch-123',
          created_at: '2023-01-01T00:00:00Z',
        },
      };

      vi.mocked(axios.post).mockResolvedValue(mockResponse);

      const result = await provider.sendMessage({
        to: '+9876543210',
        content: 'Test message',
      });

      expect(axios.post).toHaveBeenCalledWith(
        'https://eu.sms.api.sinch.com/xms/v1/test-service-plan-id/batches',
        {
          from: '+1234567890',
          to: ['+9876543210'],
          body: 'Test message',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-token',
          },
        }
      );

      expect(result).toEqual({
        id: 'batch-123',
        date: '2023-01-01T00:00:00Z',
      });
    });

    it('should use custom from number if provided', async () => {
      const mockResponse = {
        data: {
          id: 'batch-456',
          created_at: '2023-01-02T00:00:00Z',
        },
      };

      vi.mocked(axios.post).mockResolvedValue(mockResponse);

      await provider.sendMessage({
        to: '+9876543210',
        content: 'Test message',
        from: '+1111111111',
      });

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          from: '+1111111111',
        }),
        expect.any(Object)
      );
    });

    it('should use different region if configured', async () => {
      const caProvider = new SinchSmsProvider({
        ...mockConfig,
        region: 'ca',
      });

      const mockResponse = {
        data: {
          id: 'batch-789',
          created_at: '2023-01-03T00:00:00Z',
        },
      };

      vi.mocked(axios.post).mockResolvedValue(mockResponse);

      await caProvider.sendMessage({
        to: '+9876543210',
        content: 'Test message',
      });

      expect(axios.post).toHaveBeenCalledWith(
        'https://ca.sms.api.sinch.com/xms/v1/test-service-plan-id/batches',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });
});
