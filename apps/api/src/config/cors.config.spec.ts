import { expect } from 'chai';
import { spy } from 'sinon';
import { corsOptionsDelegate } from './cors.config';

const dashboardOrigin = 'https://dashboard.novu.co';
const widgetOrigin = 'https://widget.novu.co';
const previewOrigin = 'https://deploy-preview-8045.dashboard-v2.novu-staging.co';

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

  describe(`CORS Configuration`, () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
      process.env.WIDGET_BASE_URL = '';
    });

    it('should allow only dashboard and widget origins', () => {
      process.env.WIDGET_BASE_URL = widgetOrigin;
      const callbackSpy = spy();

      // @ts-expect-error - corsOptionsDelegate is not typed correctly
      corsOptionsDelegate(
        {
          url: '/v1/test',
          headers: {
            origin: dashboardOrigin,
          },
        },
        callbackSpy
      );

      expect(callbackSpy.calledOnce).to.be.ok;
      expect(callbackSpy.firstCall.firstArg).to.be.null;
      expect(callbackSpy.firstCall.lastArg.origin.length).to.equal(2);
      expect(callbackSpy.firstCall.lastArg.origin[0]).to.equal(dashboardOrigin);
      expect(callbackSpy.firstCall.lastArg.origin[1]).to.equal(widgetOrigin);
    });

    it('should allow for the preview deployments origin', () => {
      const callbackSpy = spy();

      // @ts-expect-error - corsOptionsDelegate is not typed correctly
      corsOptionsDelegate(
        {
          url: '/v1/test',
          headers: {
            origin: previewOrigin,
          },
        },
        callbackSpy
      );

      expect(callbackSpy.calledOnce).to.be.ok;
      expect(callbackSpy.firstCall.firstArg).to.be.null;
      expect(callbackSpy.firstCall.lastArg.origin.length).to.equal(1);
      expect(callbackSpy.firstCall.lastArg.origin[0]).to.equal(previewOrigin);
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
