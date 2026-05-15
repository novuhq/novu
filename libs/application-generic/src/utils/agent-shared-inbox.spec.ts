import {
  buildAgentSharedInbox,
  getSharedAgentDomain,
  isAgentSharedInboxEnabled,
  isValidAgentEmailSlugPrefix,
  parseAgentSharedInboxLocalPart,
} from './agent-shared-inbox';

const ENV_KEY = 'NOVU_AGENT_SHARED_INBOUND_DOMAIN';
const NOVU_ENTERPRISE_KEY = 'NOVU_ENTERPRISE';
const IS_SELF_HOSTED_KEY = 'IS_SELF_HOSTED';

function withEnv(vars: Record<string, string | undefined>, run: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    previous[key] = process.env[key];
    const v = vars[key];
    if (v === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = v;
    }
  }
  try {
    run();
  } finally {
    for (const key of Object.keys(vars)) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  }
}

describe('agent-shared-inbox helpers', () => {
  describe('isAgentSharedInboxEnabled', () => {
    it('is enabled when enterprise=true, self-hosted!=true, and the domain is set', () => {
      withEnv({ [NOVU_ENTERPRISE_KEY]: 'true', [IS_SELF_HOSTED_KEY]: 'false', [ENV_KEY]: 'agentconnect.sh' }, () => {
        expect(isAgentSharedInboxEnabled()).toBe(true);
      });
    });

    it('is disabled when not enterprise', () => {
      withEnv({ [NOVU_ENTERPRISE_KEY]: 'false', [IS_SELF_HOSTED_KEY]: 'false', [ENV_KEY]: 'agentconnect.sh' }, () => {
        expect(isAgentSharedInboxEnabled()).toBe(false);
      });
    });

    it('is disabled when self-hosted', () => {
      withEnv({ [NOVU_ENTERPRISE_KEY]: 'true', [IS_SELF_HOSTED_KEY]: 'true', [ENV_KEY]: 'agentconnect.sh' }, () => {
        expect(isAgentSharedInboxEnabled()).toBe(false);
      });
    });

    it('is disabled when the shared domain env var is not set', () => {
      withEnv({ [NOVU_ENTERPRISE_KEY]: 'true', [IS_SELF_HOSTED_KEY]: 'false', [ENV_KEY]: undefined }, () => {
        expect(isAgentSharedInboxEnabled()).toBe(false);
      });
    });

    it('is disabled when the shared domain env var is not a valid hostname', () => {
      const invalidDomains = [
        'foo bar',
        'bad@domain',
        '-leadingdash.com',
        'trailingdash-.com',
        'no-tld',
        '..double.dot',
        'has_underscore.com',
        ' ',
      ];
      for (const invalid of invalidDomains) {
        withEnv({ [NOVU_ENTERPRISE_KEY]: 'true', [IS_SELF_HOSTED_KEY]: 'false', [ENV_KEY]: invalid }, () => {
          expect(isAgentSharedInboxEnabled()).toBe(false);
        });
      }
    });
  });

  describe('getSharedAgentDomain', () => {
    it('returns the configured value lowercased and trimmed', () => {
      withEnv({ [ENV_KEY]: '  AgentConnect.SH  ' }, () => {
        expect(getSharedAgentDomain()).toBe('agentconnect.sh');
      });
    });

    it('throws when not set', () => {
      withEnv({ [ENV_KEY]: undefined }, () => {
        expect(() => getSharedAgentDomain()).toThrow();
      });
    });

    it('throws when the value is not a valid hostname', () => {
      withEnv({ [ENV_KEY]: 'foo bar' }, () => {
        expect(() => getSharedAgentDomain()).toThrow();
      });
      withEnv({ [ENV_KEY]: 'bad@domain' }, () => {
        expect(() => getSharedAgentDomain()).toThrow();
      });
    });
  });

  describe('buildAgentSharedInbox', () => {
    it('joins slug, _id and shared domain with the canonical separators', () => {
      withEnv({ [ENV_KEY]: 'agentconnect.sh' }, () => {
        const out = buildAgentSharedInbox('wine-bot', '65a3f1d2b8e4c7a9f3b2c1d0');
        expect(out).toBe('wine-bot-65a3f1d2b8e4c7a9f3b2c1d0@agentconnect.sh');
      });
    });

    it('throws when the agent id is not a 24-char hex string', () => {
      withEnv({ [ENV_KEY]: 'agentconnect.sh' }, () => {
        expect(() => buildAgentSharedInbox('wine-bot', 'not-an-objectid')).toThrow();
      });
    });

    it('throws when the slug is invalid', () => {
      withEnv({ [ENV_KEY]: 'agentconnect.sh' }, () => {
        expect(() => buildAgentSharedInbox('-leading-dash', '65a3f1d2b8e4c7a9f3b2c1d0')).toThrow();
        expect(() => buildAgentSharedInbox('UPPER', '65a3f1d2b8e4c7a9f3b2c1d0')).toThrow();
        expect(() => buildAgentSharedInbox('', '65a3f1d2b8e4c7a9f3b2c1d0')).toThrow();
      });
    });
  });

  describe('parseAgentSharedInboxLocalPart', () => {
    it('parses slugs containing dashes correctly', () => {
      expect(parseAgentSharedInboxLocalPart('my-cool-bot-65a3f1d2b8e4c7a9f3b2c1d0')).toEqual({
        slug: 'my-cool-bot',
        agentId: '65a3f1d2b8e4c7a9f3b2c1d0',
      });
    });

    it('parses simple slugs', () => {
      expect(parseAgentSharedInboxLocalPart('agent-65a3f1d2b8e4c7a9f3b2c1d0')).toEqual({
        slug: 'agent',
        agentId: '65a3f1d2b8e4c7a9f3b2c1d0',
      });
    });

    it('returns null when the trailing 24 chars are not hex', () => {
      expect(parseAgentSharedInboxLocalPart('agent-not-hex-zzzzzzzzzzzzz')).toBeNull();
    });

    it('returns null when the slug is empty', () => {
      // Local part is exactly "-{24hex}" with no slug → null
      expect(parseAgentSharedInboxLocalPart('-65a3f1d2b8e4c7a9f3b2c1d0')).toBeNull();
    });

    it('returns null when no dash separates slug from id', () => {
      expect(parseAgentSharedInboxLocalPart('agent65a3f1d2b8e4c7a9f3b2c1d0')).toBeNull();
    });

    it('returns null for inputs shorter than the id', () => {
      expect(parseAgentSharedInboxLocalPart('short')).toBeNull();
      expect(parseAgentSharedInboxLocalPart('')).toBeNull();
    });
  });

  describe('isValidAgentEmailSlugPrefix', () => {
    it('accepts valid slugs', () => {
      expect(isValidAgentEmailSlugPrefix('a')).toBe(true);
      expect(isValidAgentEmailSlugPrefix('wine-bot')).toBe(true);
      expect(isValidAgentEmailSlugPrefix('a1b2c3-d4e5f6')).toBe(true);
      expect(isValidAgentEmailSlugPrefix('a'.repeat(32))).toBe(true);
    });

    it('rejects invalid slugs', () => {
      expect(isValidAgentEmailSlugPrefix('')).toBe(false);
      expect(isValidAgentEmailSlugPrefix('-leading')).toBe(false);
      expect(isValidAgentEmailSlugPrefix('trailing-')).toBe(false);
      expect(isValidAgentEmailSlugPrefix('UPPER')).toBe(false);
      expect(isValidAgentEmailSlugPrefix('a'.repeat(33))).toBe(false);
      expect(isValidAgentEmailSlugPrefix('has space')).toBe(false);
      expect(isValidAgentEmailSlugPrefix('has.dot')).toBe(false);
    });
  });
});
