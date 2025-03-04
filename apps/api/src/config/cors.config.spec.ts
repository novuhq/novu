import { spy } from 'sinon';
import { expect } from 'chai';
import { corsOptionsDelegate } from './cors.config';

describe('CORS Configuration', () => {
  describe('Local Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'local';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should allow all origins', () => {
      const callbackSpy = spy();

      // @ts-expect-error - corsOptionsDelegate is not typed correctly
      corsOptionsDelegate({ url: '/v1/test' }, callbackSpy);

      expect(callbackSpy.calledOnce).to.be.ok;
      expect(callbackSpy.firstCall.firstArg).to.be.null;
      expect(callbackSpy.firstCall.lastArg.origin).to.equal('*');
    });
  });

  (['dev', 'production'] as const).forEach((environment) => {
    describe(`${environment} Environment CORS Configuration`, () => {
      beforeEach(() => {
        process.env.NODE_ENV = environment;

        process.env.FRONT_BASE_URL = 'https://test.com';
        process.env.LEGACY_STAGING_DASHBOARD_URL = 'https://test-legacy-staging-dashboard.com';
        process.env.WIDGET_BASE_URL = 'https://widget.com';
      });

      afterEach(() => {
        process.env.NODE_ENV = 'test';
      });

      it('should allow only front base url and widget url', () => {
        const callbackSpy = spy();

        // @ts-expect-error - corsOptionsDelegate is not typed correctly
        corsOptionsDelegate(
          {
            url: '/v1/test',
            headers: {
              origin: 'https://test.novu.com',
            },
          },
          callbackSpy
        );

        expect(callbackSpy.calledOnce).to.be.ok;
        expect(callbackSpy.firstCall.firstArg).to.be.null;
        expect(callbackSpy.firstCall.lastArg.origin.length).to.equal(environment === 'dev' ? 4 : 3);
        expect(callbackSpy.firstCall.lastArg.origin[0]).to.equal(process.env.FRONT_BASE_URL);
        expect(callbackSpy.firstCall.lastArg.origin[1]).to.equal(process.env.LEGACY_STAGING_DASHBOARD_URL);
        expect(callbackSpy.firstCall.lastArg.origin[2]).to.equal(process.env.WIDGET_BASE_URL);

        if (environment === 'dev') {
          expect(callbackSpy.firstCall.lastArg.origin[3]).to.equal('https://test.novu.com');
        }
      });

      it('widget routes should be wildcarded', () => {
        const callbackSpy = spy();

        // @ts-expect-error - corsOptionsDelegate is not typed correctly
        corsOptionsDelegate({ url: '/v1/widgets/test' }, callbackSpy);

        expect(callbackSpy.calledOnce).to.be.ok;
        expect(callbackSpy.firstCall.firstArg).to.be.null;
        expect(callbackSpy.firstCall.lastArg.origin).to.equal('*');
      });

      it('inbox routes should be wildcarded', () => {
        const callbackSpy = spy();

        // @ts-expect-error - corsOptionsDelegate is not typed correctly
        corsOptionsDelegate({ url: '/v1/inbox/session' }, callbackSpy);

        expect(callbackSpy.calledOnce).to.be.ok;
        expect(callbackSpy.firstCall.firstArg).to.be.null;
        expect(callbackSpy.firstCall.lastArg.origin).to.equal('*');
      });
    });
  });
});
