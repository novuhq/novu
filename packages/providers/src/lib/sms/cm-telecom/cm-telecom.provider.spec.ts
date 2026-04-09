import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CmTelecomSmsProvider } from './cm-telecom.provider';

vi.mock('axios');

describe('CmTelecomSmsProvider', () => {
  const mockConfig = {
    productToken: 'test-product-token',
    from: 'TestSender',
  };

  let provider: CmTelecomSmsProvider;

  beforeEach(() => {
    provider = new CmTelecomSmsProvider(mockConfig);
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send an SMS message successfully', async () => {
      const mockResponse = {
        data: {
          details: [{ reference: 'msg-123' }],
        },
      };

      vi.mocked(axios.post).mockResolvedValue(mockResponse);

      const result = await provider.sendMessage({
        to: '+32470123456',
        content: 'Test message',
        id: 'novu-ref-123',
      });

      expect(axios.post).toHaveBeenCalledWith(
        'https://gw.messaging.cm.com/v1.0/message',
        {
          messages: {
            msg: [
              {
                allowedChannels: ['SMS'],
                from: 'TestSender',
                to: [{ number: '0032470123456' }],
                body: {
                  type: 'auto',
                  content: 'Test message',
                },
                reference: 'novu-ref-123',
              },
            ],
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CM-PRODUCTTOKEN': 'test-product-token',
          },
        }
      );

      expect(result).toEqual({
        id: 'msg-123',
        date: expect.any(String),
      });
    });

    it('should use custom from if provided in options', async () => {
      const mockResponse = {
        data: {
          details: [{ reference: 'msg-456' }],
        },
      };

      vi.mocked(axios.post).mockResolvedValue(mockResponse);

      await provider.sendMessage({
        to: '+32470123456',
        content: 'Test message',
        from: 'CustomSender',
      });

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: {
            msg: [
              expect.objectContaining({
                from: 'CustomSender',
              }),
            ],
          },
        }),
        expect.any(Object)
      );
    });

    it('should format phone number with + prefix correctly', async () => {
      const mockResponse = { data: { details: [] } };
      vi.mocked(axios.post).mockResolvedValue(mockResponse);

      await provider.sendMessage({
        to: '+32470123456',
        content: 'Test',
      });

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: {
            msg: [
              expect.objectContaining({
                to: [{ number: '0032470123456' }],
              }),
            ],
          },
        }),
        expect.any(Object)
      );
    });

    it('should format phone number without prefix correctly', async () => {
      const mockResponse = { data: { details: [] } };
      vi.mocked(axios.post).mockResolvedValue(mockResponse);

      await provider.sendMessage({
        to: '32470123456',
        content: 'Test',
      });

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: {
            msg: [
              expect.objectContaining({
                to: [{ number: '0032470123456' }],
              }),
            ],
          },
        }),
        expect.any(Object)
      );
    });

    it('should handle phone number already with 00 prefix', async () => {
      const mockResponse = { data: { details: [] } };
      vi.mocked(axios.post).mockResolvedValue(mockResponse);

      await provider.sendMessage({
        to: '0032470123456',
        content: 'Test',
      });

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: {
            msg: [
              expect.objectContaining({
                to: [{ number: '0032470123456' }],
              }),
            ],
          },
        }),
        expect.any(Object)
      );
    });
  });
});
