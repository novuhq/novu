import { describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({
  default: {
    request: vi.fn(),
    isAxiosError: () => false,
  },
}));

import axios from 'axios';
import { requestApiJson } from './api-request';

describe('requestApiJson', () => {
  it('unwraps Novu API data envelopes', async () => {
    vi.mocked(axios.request).mockResolvedValue({
      status: 201,
      data: {
        data: {
          deviceCode: 'abc123',
          expiresIn: 300,
          interval: 2,
        },
      },
    });

    const result = await requestApiJson<{ deviceCode: string }>('https://api.novu.co', '/cli/device-sessions', {
      method: 'POST',
      body: { name: 'novu-connect' },
    });

    expect(result.deviceCode).toBe('abc123');
  });
});
