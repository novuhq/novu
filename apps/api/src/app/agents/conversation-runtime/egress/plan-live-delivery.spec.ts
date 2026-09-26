import { expect } from 'chai';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { resolvePlanDeliveryMode } from './plan-live-delivery';

describe('resolvePlanDeliveryMode', () => {
  const nativeAdapter = {
    postObject: async () => ({ id: '1', threadId: 't' }),
    editObject: async () => undefined,
  };
  const markdownAdapter = { editMessage: async () => ({ id: '1', threadId: 't' }) };

  it('allows Slack native plan objects', () => {
    expect(resolvePlanDeliveryMode(AgentPlatformEnum.SLACK, nativeAdapter)).to.equal('native');
  });

  it('allows Telegram and Teams markdown plan edits', () => {
    expect(resolvePlanDeliveryMode(AgentPlatformEnum.TELEGRAM, markdownAdapter)).to.equal('markdown');
    expect(resolvePlanDeliveryMode(AgentPlatformEnum.TEAMS, markdownAdapter)).to.equal('markdown');
  });

  it('disallows WhatsApp and email even when editMessage exists', () => {
    expect(resolvePlanDeliveryMode(AgentPlatformEnum.WHATSAPP, markdownAdapter)).to.equal(null);
    expect(resolvePlanDeliveryMode(AgentPlatformEnum.EMAIL, markdownAdapter)).to.equal(null);
  });

  it('disallows platforms without post or edit capability', () => {
    expect(resolvePlanDeliveryMode(AgentPlatformEnum.TELEGRAM, {})).to.equal(null);
  });

  it('uses markdown when only postObject is present without editObject', () => {
    const mixedAdapter = {
      postObject: async () => ({ id: '1', threadId: 't' }),
      editMessage: async () => ({ id: '1', threadId: 't' }),
    };

    expect(resolvePlanDeliveryMode(AgentPlatformEnum.TELEGRAM, mixedAdapter)).to.equal('markdown');
  });
});
