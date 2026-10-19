import type { IncomingHttpHeaders } from 'node:http';
import * as safeOutboundHttp from '@novu/shared/utils/safe-outbound-http';
import { vi } from 'vitest';

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Code should not be used outside of tests');
}

type SafeOutboundJsonSpyReturnType = {
  mockSafeOutboundJsonRequest: ReturnType<typeof vi.fn>;
  safeOutboundJsonSpy: ReturnType<typeof vi.spyOn>;
};

export function safeOutboundJsonSpy({
  body = {},
  headers = {},
  statusCode = 200,
}: {
  body?: unknown;
  headers?: IncomingHttpHeaders;
  statusCode?: number;
} = {}): SafeOutboundJsonSpyReturnType {
  const mockSafeOutboundJsonRequest = vi.fn(() => {
    return Promise.resolve({
      statusCode,
      statusMessage: 'OK',
      headers,
      body,
    });
  });

  const safeOutboundJsonSpy = vi
    .spyOn(safeOutboundHttp, 'safeOutboundJsonRequest')
    .mockImplementation(mockSafeOutboundJsonRequest);

  return { mockSafeOutboundJsonRequest, safeOutboundJsonSpy };
}
