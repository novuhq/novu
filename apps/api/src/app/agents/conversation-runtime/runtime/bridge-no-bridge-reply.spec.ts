import { expect } from 'chai';
import {
  buildAgentDashboardOverviewUrl,
  buildNoBridgeReply,
  isCliCreationSource,
  ONBOARDING_NO_BRIDGE_CLI_TEXT,
  ONBOARDING_NO_BRIDGE_DASHBOARD_TEXT,
} from './bridge-no-bridge-reply';

describe('bridge-no-bridge-reply', () => {
  describe('isCliCreationSource', () => {
    it('returns true only for cli', () => {
      expect(isCliCreationSource('cli')).to.equal(true);
      expect(isCliCreationSource('dashboard')).to.equal(false);
      expect(isCliCreationSource('dashboard_onboarding')).to.equal(false);
      expect(isCliCreationSource('api')).to.equal(false);
      expect(isCliCreationSource(undefined)).to.equal(false);
    });
  });

  describe('buildAgentDashboardOverviewUrl', () => {
    it('uses the environment slug (not identifier) in the path', () => {
      const url = buildAgentDashboardOverviewUrl({
        dashboardBase: 'https://dashboard.novu.co',
        environmentName: 'Development',
        environmentId: '507f1f77bcf86cd799439011',
        agentIdentifier: 'testing-flow-behaviour',
      });

      expect(url).to.match(
        /^https:\/\/dashboard\.novu\.co\/env\/dev_env_[A-Za-z0-9]+\/agents\/testing-flow-behaviour\/overview$/
      );
      expect(url).to.not.include('ljltorgblccz');
    });
  });

  describe('buildNoBridgeReply', () => {
    it('prompts CLI users to continue in the terminal without a dashboard button', () => {
      const reply = buildNoBridgeReply({
        creationSource: 'cli',
        dashboardUrl: 'https://dashboard.novu.co/env/dev_env_abc/agents/x/overview',
      });

      expect(reply.content).to.equal(ONBOARDING_NO_BRIDGE_CLI_TEXT);
      expect(reply.card).to.deep.equal({
        type: 'card',
        children: [{ type: 'text', content: ONBOARDING_NO_BRIDGE_CLI_TEXT }],
      });
    });

    it('includes Continue setup for dashboard-created agents when a URL is available', () => {
      const dashboardUrl = 'https://dashboard.novu.co/env/dev_env_abc/agents/x/overview';
      const reply = buildNoBridgeReply({
        creationSource: 'dashboard_onboarding',
        dashboardUrl,
      });

      expect(reply.content).to.equal(ONBOARDING_NO_BRIDGE_DASHBOARD_TEXT);
      expect(reply.card).to.deep.equal({
        type: 'card',
        children: [
          { type: 'text', content: ONBOARDING_NO_BRIDGE_DASHBOARD_TEXT },
          { type: 'divider' },
          {
            type: 'actions',
            children: [{ type: 'link-button', label: 'Continue setup', url: dashboardUrl, style: 'primary' }],
          },
        ],
      });
    });

    it('omits the button when no dashboard URL can be resolved', () => {
      const reply = buildNoBridgeReply({ creationSource: 'dashboard' });

      expect(reply.content).to.equal(ONBOARDING_NO_BRIDGE_DASHBOARD_TEXT);
      expect(reply.card).to.deep.equal({
        type: 'card',
        children: [{ type: 'text', content: ONBOARDING_NO_BRIDGE_DASHBOARD_TEXT }],
      });
    });
  });
});
