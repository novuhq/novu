import { spy } from 'sinon';
import { expect } from 'chai';
import { corsOptionsDelegate } from './cors.config';

const dashboardOrigin = 'https://dashboard.novu.co';
const widgetOrigin = 'https://widget.novu.co';
const previewOrigin = 'https://preview.novu.co';

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

        process.env.FRONT_BASE_URL = dashboardOrigin;
        process.env.WIDGET_BASE_URL = widgetOrigin;
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
              origin: environment === 'dev' ? previewOrigin : dashboardOrigin,
            },
          },
          callbackSpy
        );

        expect(callbackSpy.calledOnce).to.be.ok;
        expect(callbackSpy.firstCall.firstArg).to.be.null;
        expect(callbackSpy.firstCall.lastArg.origin.length).to.equal(2);
        expect(callbackSpy.firstCall.lastArg.origin[0]).to.equal(
          environment === 'dev' ? previewOrigin : dashboardOrigin
        );
        expect(callbackSpy.firstCall.lastArg.origin[1]).to.equal(widgetOrigin);
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
