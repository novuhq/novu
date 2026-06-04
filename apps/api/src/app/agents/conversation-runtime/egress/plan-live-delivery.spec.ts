import { expect } from 'chai';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { resolvePlanDeliveryMode, supportsLivePlanDelivery } from './plan-live-delivery';

describe('supportsLivePlanDelivery', () => {
  const nativeAdapter = {
    postObject: async () => ({ id: '1', threadId: 't' }),
    editObject: async () => undefined,
  };
  const markdownAdapter = { editMessage: async () => ({ id: '1', threadId: 't' }) };

  it('allows Slack native plan objects', () => {
    expect(supportsLivePlanDelivery(AgentPlatformEnum.SLACK, nativeAdapter)).to.equal(true);
  });

  it('allows Telegram and Teams markdown plan edits', () => {
    expect(supportsLivePlanDelivery(AgentPlatformEnum.TELEGRAM, markdownAdapter)).to.equal(true);
    expect(supportsLivePlanDelivery(AgentPlatformEnum.TEAMS, markdownAdapter)).to.equal(true);
  });

  it('disallows WhatsApp and email even when editMessage exists', () => {
    expect(supportsLivePlanDelivery(AgentPlatformEnum.WHATSAPP, markdownAdapter)).to.equal(false);
    expect(supportsLivePlanDelivery(AgentPlatformEnum.EMAIL, markdownAdapter)).to.equal(false);
  });

  it('disallows platforms without post or edit capability', () => {
    expect(supportsLivePlanDelivery(AgentPlatformEnum.TELEGRAM, {})).to.equal(false);
  });

  it('uses markdown when only postObject is present without editObject', () => {
    const mixedAdapter = {
      postObject: async () => ({ id: '1', threadId: 't' }),
      editMessage: async () => ({ id: '1', threadId: 't' }),
    };

    expect(resolvePlanDeliveryMode(AgentPlatformEnum.TELEGRAM, mixedAdapter)).to.equal('markdown');
  });
});
