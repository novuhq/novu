import { describe, expect, it } from 'vitest';
import type { AgentIntegrationLink } from '../api/setup';
import {
  findLinkedIntegration,
  inferViaFromLinks,
  linkedVias,
  parseEmailAddress,
  viaForProviderId,
} from './link-channel';

function link(providerId: string, identifier = providerId, active = true): AgentIntegrationLink {
  return { integration: { identifier, providerId, active } };
}

describe('viaForProviderId', () => {
  it('maps known provider ids onto human channels', () => {
    expect(viaForProviderId('telegram')).toBe('telegram');
    expect(viaForProviderId('slack')).toBe('slack');
    expect(viaForProviderId('novu-slack')).toBe('slack');
    expect(viaForProviderId('novu-email-agent')).toBe('email');
    expect(viaForProviderId('novu-email')).toBe('email');
    expect(viaForProviderId('whatsapp-business')).toBeNull();
  });
});

describe('inferViaFromLinks', () => {
  it('returns the sole linked channel', () => {
    expect(inferViaFromLinks([link('telegram')])).toBe('telegram');
  });

  it('returns null when none or several channels are linked', () => {
    expect(inferViaFromLinks([])).toBeNull();
    expect(inferViaFromLinks([link('telegram'), link('slack')])).toBeNull();
  });

  it('ignores inactive links', () => {
    expect(inferViaFromLinks([link('telegram', 'tg', false), link('slack')])).toBe('slack');
  });
});

describe('findLinkedIntegration', () => {
  it('picks the integration for the requested channel', () => {
    const links = [link('telegram', 'tg-1'), link('slack', 'sl-1')];

    expect(findLinkedIntegration(links, 'slack')?.integration.identifier).toBe('sl-1');
    expect(findLinkedIntegration(links, 'email')).toBeUndefined();
  });
});

describe('linkedVias', () => {
  it('dedupes platforms in first-seen order', () => {
    expect(linkedVias([link('slack'), link('novu-slack'), link('telegram')])).toEqual(['slack', 'telegram']);
  });
});

describe('parseEmailAddress', () => {
  it('accepts a trimmed address and rejects junk', () => {
    expect(parseEmailAddress('  Bob@Acme.com ')).toBe('bob@acme.com');
    expect(parseEmailAddress('not-an-email')).toBeNull();
  });
});
