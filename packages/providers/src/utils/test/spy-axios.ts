import axios from 'axios';

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Code should not be used outside of tests');
}

export const axiosSpy = ({
  data = {},
  headers = {},
}: {
  data?: Record<string, unknown> | Record<string, unknown>[] | string | boolean;
  headers?: Record<string, unknown>;
} = {}) => {
  const mockPost = jest.fn(() => {
    return { data, headers };
  });

  const mockRequest = jest.fn(() => {
    return { data, headers };
  });

  const mockGet = jest.fn(() => {
    return Promise.resolve(data);
  });

  const axiosMockSpy = jest.spyOn(axios, 'create').mockImplementation(() => {
    return {
      post: mockPost,
      get: mockGet,
      request: mockRequest,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  return { mockPost, mockRequest, mockGet, axiosMockSpy };
};
