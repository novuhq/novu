import { corsOptionsDelegate } from './cors';
import { spy } from 'sinon';
import { expect } from 'chai';

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

      // @ts-ignore
      corsOptionsDelegate({ url: '/v1/test' }, callbackSpy);

      expect(callbackSpy.calledOnce).to.be.ok;
      expect(callbackSpy.firstCall.firstArg).to.be.null;
      expect(callbackSpy.firstCall.lastArg.origin).to.equal('*');
    });
  });

  (['dev', 'production'] as const).forEach((environment) => {
    describe(environment + ' Environment CORS Configuration', () => {
      beforeEach(() => {
        process.env.NODE_ENV = environment;

        process.env.FRONT_BASE_URL = 'https://test.com';
        process.env.WIDGET_BASE_URL = 'https://widget.com';
        process.env.PR_PREVIEW_ROOT_URL = 'https://pr-preview.com';
      });

      afterEach(() => {
        process.env.NODE_ENV = 'test';
      });

      it('should allow only front base url and widget url', () => {
        const callbackSpy = spy();

        // @ts-ignore
        corsOptionsDelegate({ url: '/v1/test' }, callbackSpy);

        expect(callbackSpy.calledOnce).to.be.ok;
        expect(callbackSpy.firstCall.firstArg).to.be.null;
        expect(callbackSpy.firstCall.lastArg.origin.length).to.equal(2);
        expect(callbackSpy.firstCall.lastArg.origin[0]).to.equal('https://test.com');
        expect(callbackSpy.firstCall.lastArg.origin[1]).to.equal('https://widget.com');
      });

      it('widget routes should be wildcarded', () => {
        const callbackSpy = spy();

        // @ts-ignore
        corsOptionsDelegate({ url: '/v1/widgets/test' }, callbackSpy);

        expect(callbackSpy.calledOnce).to.be.ok;
        expect(callbackSpy.firstCall.firstArg).to.be.null;
        expect(callbackSpy.firstCall.lastArg.origin).to.equal('*');
      });

      if (environment === 'dev') {
        it('should allow all origins for dev environment from pr preview', () => {
          const callbackSpy = spy();

          // @ts-ignore
          corsOptionsDelegate(
            {
              url: '/v1/test',
              headers: {
                origin: 'https://test--' + process.env.PR_PREVIEW_ROOT_URL,
              },
            },
            callbackSpy
          );

          expect(callbackSpy.calledOnce).to.be.ok;
          expect(callbackSpy.firstCall.firstArg).to.be.null;
          expect(callbackSpy.firstCall.lastArg.origin).to.equal('*');
        });
      }
    });
  });
});
