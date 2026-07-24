import {
  buildAgentSharedInbox,
  generateAgentInboxRoutingKey,
  getSharedAgentDomain,
  isAgentEmailEnabled,
  isAgentSharedInboxEnabled,
  isValidAgentEmailSlugPrefix,
  isValidAgentInboxRoutingKey,
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

  describe('isAgentEmailEnabled', () => {
    // CI_EE_TEST also flips the enterprise flag, so it is pinned off here to keep
    // each case controlled solely by NOVU_ENTERPRISE.
    const CI_EE_TEST_KEY = 'CI_EE_TEST';

    it('is enabled on cloud when enterprise and the shared domain is set (matches shared inbox gate)', () => {
      withEnv(
        {
          [NOVU_ENTERPRISE_KEY]: 'true',
          [CI_EE_TEST_KEY]: undefined,
          [IS_SELF_HOSTED_KEY]: 'false',
          [ENV_KEY]: 'agentconnect.sh',
        },
        () => {
          expect(isAgentEmailEnabled()).toBe(true);
        }
      );
    });

    it('is disabled on degraded cloud when enterprise but the shared domain is missing (zero delta vs shared inbox gate)', () => {
      withEnv(
        {
          [NOVU_ENTERPRISE_KEY]: 'true',
          [CI_EE_TEST_KEY]: undefined,
          [IS_SELF_HOSTED_KEY]: 'false',
          [ENV_KEY]: undefined,
        },
        () => {
          expect(isAgentEmailEnabled()).toBe(false);
          expect(isAgentEmailEnabled()).toBe(isAgentSharedInboxEnabled());
        }
      );
    });

    it('is enabled on self-hosted enterprise regardless of the shared domain', () => {
      withEnv(
        {
          [NOVU_ENTERPRISE_KEY]: 'true',
          [CI_EE_TEST_KEY]: undefined,
          [IS_SELF_HOSTED_KEY]: 'true',
          [ENV_KEY]: undefined,
        },
        () => {
          expect(isAgentEmailEnabled()).toBe(true);
        }
      );
    });

    it('is disabled for community (not enterprise), self-hosted or not', () => {
      withEnv(
        {
          [NOVU_ENTERPRISE_KEY]: 'false',
          [CI_EE_TEST_KEY]: undefined,
          [IS_SELF_HOSTED_KEY]: 'true',
          [ENV_KEY]: 'agentconnect.sh',
        },
        () => {
          expect(isAgentEmailEnabled()).toBe(false);
        }
      );
      withEnv(
        {
          [NOVU_ENTERPRISE_KEY]: 'false',
          [CI_EE_TEST_KEY]: undefined,
          [IS_SELF_HOSTED_KEY]: 'false',
          [ENV_KEY]: 'agentconnect.sh',
        },
        () => {
          expect(isAgentEmailEnabled()).toBe(false);
        }
      );
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

  describe('generateAgentInboxRoutingKey', () => {
    it('produces an 8-char lowercase-alnum key that passes isValidAgentInboxRoutingKey', () => {
      for (let i = 0; i < 32; i += 1) {
        const key = generateAgentInboxRoutingKey();
        expect(key).toHaveLength(8);
        expect(key).toMatch(/^[a-z0-9]{8}$/);
        expect(isValidAgentInboxRoutingKey(key)).toBe(true);
      }
    });
  });

  describe('isValidAgentInboxRoutingKey', () => {
    it('accepts 8 lowercase-alnum characters', () => {
      expect(isValidAgentInboxRoutingKey('abcd1234')).toBe(true);
      expect(isValidAgentInboxRoutingKey('00000000')).toBe(true);
      expect(isValidAgentInboxRoutingKey('zzzzzzzz')).toBe(true);
    });

    it('rejects anything that does not match exactly 8 lowercase-alnum chars', () => {
      expect(isValidAgentInboxRoutingKey('')).toBe(false);
      expect(isValidAgentInboxRoutingKey('abc')).toBe(false);
      expect(isValidAgentInboxRoutingKey('abcdefghi')).toBe(false);
      expect(isValidAgentInboxRoutingKey('ABCD1234')).toBe(false);
      expect(isValidAgentInboxRoutingKey('abcd-234')).toBe(false);
      expect(isValidAgentInboxRoutingKey('abcd 234')).toBe(false);
    });
  });

  describe('buildAgentSharedInbox', () => {
    it('joins slug, inboxRoutingKey and shared domain with the canonical separators', () => {
      withEnv({ [ENV_KEY]: 'agentconnect.sh' }, () => {
        const out = buildAgentSharedInbox('wine-bot', 'a1b2c3d4');
        expect(out).toBe('wine-bot-a1b2c3d4@agentconnect.sh');
      });
    });

    it('throws when the routing key is not 8 lowercase-alnum chars', () => {
      withEnv({ [ENV_KEY]: 'agentconnect.sh' }, () => {
        expect(() => buildAgentSharedInbox('wine-bot', 'too-short')).toThrow();
        expect(() => buildAgentSharedInbox('wine-bot', 'ABCDEFGH')).toThrow();
        expect(() => buildAgentSharedInbox('wine-bot', '')).toThrow();
      });
    });

    it('throws when the slug is invalid', () => {
      withEnv({ [ENV_KEY]: 'agentconnect.sh' }, () => {
        expect(() => buildAgentSharedInbox('-leading-dash', 'a1b2c3d4')).toThrow();
        expect(() => buildAgentSharedInbox('UPPER', 'a1b2c3d4')).toThrow();
        expect(() => buildAgentSharedInbox('', 'a1b2c3d4')).toThrow();
      });
    });
  });

  describe('parseAgentSharedInboxLocalPart', () => {
    it('parses slugs containing dashes correctly', () => {
      expect(parseAgentSharedInboxLocalPart('my-cool-bot-a1b2c3d4')).toEqual({
        slug: 'my-cool-bot',
        inboxRoutingKey: 'a1b2c3d4',
      });
    });

    it('parses simple slugs', () => {
      expect(parseAgentSharedInboxLocalPart('agent-a1b2c3d4')).toEqual({
        slug: 'agent',
        inboxRoutingKey: 'a1b2c3d4',
      });
    });

    it('returns null when the trailing 8 chars are not lowercase-alnum', () => {
      expect(parseAgentSharedInboxLocalPart('agent-ABCDEF12')).toBeNull();
      expect(parseAgentSharedInboxLocalPart('agent-zzzz-yy')).toBeNull();
    });

    it('returns null when the slug is empty', () => {
      // Local part is exactly "-{key}" with no slug → null
      expect(parseAgentSharedInboxLocalPart('-a1b2c3d4')).toBeNull();
    });

    it('returns null when no dash separates slug from key', () => {
      expect(parseAgentSharedInboxLocalPart('agenta1b2c3d4')).toBeNull();
    });

    it('returns null for inputs shorter than the key', () => {
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
