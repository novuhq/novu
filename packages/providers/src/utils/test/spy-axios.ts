import axios from 'axios';
import { vi } from 'vitest';

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Code should not be used outside of tests');
}

type AxiosSpyReturnType = {
  mockPost: ReturnType<typeof vi.fn>;
  mockRequest: ReturnType<typeof vi.fn>;
  mockGet: ReturnType<typeof vi.fn>;
  axiosMockSpy: ReturnType<typeof vi.spyOn>;
};

export const axiosSpy = ({
  data = {},
  headers = {},
}: {
  data?: Record<string, unknown> | Record<string, unknown>[] | string | boolean;
  headers?: Record<string, unknown>;
} = {}): AxiosSpyReturnType => {
  const mockPost = vi.fn(() => {
    return { data, headers };
  });

  const mockRequest = vi.fn(() => {
    return { data, headers };
  });

  const mockGet = vi.fn(() => {
    return Promise.resolve(data);
  });

  const axiosMockSpy = vi.spyOn(axios, 'create').mockImplementation(() => {
    return {
      post: mockPost,
      get: mockGet,
      request: mockRequest,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  return { mockPost, mockRequest, mockGet, axiosMockSpy };
};
