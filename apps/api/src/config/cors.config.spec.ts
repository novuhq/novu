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

    it('web-chat routes should be wildcarded', () => {
      const callbackSpy = spy();

      // @ts-expect-error - corsOptionsDelegate is not typed correctly
      corsOptionsDelegate({ url: '/v1/web-chat/conversations' }, callbackSpy);

      expect(callbackSpy.calledOnce).to.be.ok;
      expect(callbackSpy.firstCall.firstArg).to.be.null;
      expect(callbackSpy.firstCall.lastArg.origin).to.equal('*');
    });

    describe('Human dashboard invite page', () => {
      const humanDashboardOrigin = 'https://gethuman.md';

      afterEach(() => {
        delete process.env.HUMAN_DASHBOARD_URL;
      });

      // Requests come from the dashboard, so any Human dashboard origin in the result was added for the route.
      function originsFor(url: string) {
        const callbackSpy = spy();

        corsOptionsDelegate({ url, headers: { origin: dashboardOrigin } }, callbackSpy);

        return callbackSpy.firstCall.lastArg.origin as string[];
      }

      it('allows the Human dashboard on the public invite routes', () => {
        process.env.HUMAN_DASHBOARD_URL = 'https://gethuman.md/';

        expect(originsFor('/v1/human/invites/status?token=abc')).to.include(humanDashboardOrigin);
        expect(originsFor('/v1/human/invites/connect')).to.include(humanDashboardOrigin);
      });

      it('falls back to gethuman.md when HUMAN_DASHBOARD_URL is not set', () => {
        expect(originsFor('/v1/human/invites/decline')).to.include(humanDashboardOrigin);
      });

      it('does not allow the Human dashboard anywhere else', () => {
        expect(originsFor('/v1/human/invites')).to.not.include(humanDashboardOrigin);
        expect(originsFor('/v1/human/interactions')).to.not.include(humanDashboardOrigin);
      });
    });
  });
});
