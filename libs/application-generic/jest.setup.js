require('dotenv').config({ path: './src/.env.test' });

jest.mock('newrelic', () => ({
  startBackgroundTransaction: jest.fn((name, group, handler) => {
    if (typeof handler === 'function') {
      return handler();
    }
  }),
  getTransaction: jest.fn(() => ({
    end: jest.fn(),
  })),
  noticeError: jest.fn(),
}));
