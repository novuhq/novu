import { corsOptionsDelegate } from './cors';
import { spy } from 'sinon';

describe('CORS Configuration', () => {
  describe('Dev Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'dev';
    });

    const callbackSpy = spy();

    // @ts-ignore
    corsOptionsDelegate({ url: '/v1/test' }, callbackSpy);
    console.log(callbackSpy);
  });
});
