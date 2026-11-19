import { createHash } from 'node:crypto';
import { expect } from 'chai';
import {
  ApiKeyRevocationModeEnum,
  ApiKeyRevocationPolicy,
  canSignWithApiKey,
  DEFAULT_ALLOWED_ROUTES,
  evaluateApiKeyRequest,
  getApiKeyCreatedAt,
  getRevokedApiKeyMessage,
  hashApiKeyFromHeader,
  normalizeRoutePath,
  parseApiKeyRevocationPolicy,
  REVOKED_API_KEY_MESSAGE,
  requiresRotation,
  TRIGGER_ONLY_API_KEY_MESSAGE,
} from './api-key-revocation.policy';

const NOW = new Date('2026-11-19T12:00:00.000Z');
const CUTOFF = '2026-11-19T06:00:00.000Z';
const BEFORE_CUTOFF = new Date('2026-11-18T10:00:00.000Z');
const AFTER_CUTOFF = new Date('2026-11-19T08:00:00.000Z');

function objectIdCreatedAt(date: Date): string {
  return `${Math.floor(date.getTime() / 1000)
    .toString(16)
    .padStart(8, '0')}0000000000000000`;
}

function policyFor(value: unknown): ApiKeyRevocationPolicy {
  return parseApiKeyRevocationPolicy(value, NOW).policy;
}

describe('API key revocation policy', () => {
  describe('parseApiKeyRevocationPolicy', () => {
    it('is off without a value', () => {
      for (const value of [undefined, null, '']) {
        expect(parseApiKeyRevocationPolicy(value, NOW)).to.deep.equal({
          policy: { mode: ApiKeyRevocationModeEnum.OFF },
          problems: [],
        });
      }
    });

    it('is off for an explicit "off" without asking for a cutoff', () => {
      expect(parseApiKeyRevocationPolicy({ mode: 'off' }, NOW).problems).to.deep.equal([]);
      expect(policyFor({ mode: 'off' }).mode).to.equal(ApiKeyRevocationModeEnum.OFF);
    });

    it('reads a JSON flag value', () => {
      const policy = policyFor({ mode: 'block_except_allowed', keysCreatedBefore: CUTOFF });

      expect(policy.mode).to.equal(ApiKeyRevocationModeEnum.BLOCK_EXCEPT_ALLOWED);
      expect(policy.mode !== ApiKeyRevocationModeEnum.OFF && policy.keysCreatedBefore.toISOString()).to.equal(CUTOFF);
    });

    it('reads a UTC cutoff without seconds or milliseconds', () => {
      const policy = policyFor({ mode: 'block_all', keysCreatedBefore: '2026-11-19T06:00Z' });

      expect(policy.mode !== ApiKeyRevocationModeEnum.OFF && policy.keysCreatedBefore.toISOString()).to.equal(CUTOFF);
    });

    it('reads a string holding JSON, as string flags and environment variables send it', () => {
      const policy = policyFor(JSON.stringify({ mode: 'block_all', keysCreatedBefore: CUTOFF }));

      expect(policy.mode).to.equal(ApiKeyRevocationModeEnum.BLOCK_ALL);
    });

    it('turns off and says why for values it cannot use', () => {
      const cases: Array<[unknown, string]> = [
        ['{not json', 'not valid JSON'],
        [['block_all'], 'not a JSON object'],
        [{ mode: 'block_everything', keysCreatedBefore: CUTOFF }, '"mode" must be one of'],
        [{ mode: 'block_all' }, '"keysCreatedBefore" must be a UTC date and time'],
        [{ mode: 'block_all', keysCreatedBefore: 'yesterday' }, '"keysCreatedBefore" must be a UTC date and time'],
        [{ mode: 'block_all', keysCreatedBefore: '2026-02-30T00:00:00.000Z' }, 'must be a UTC date and time'],
        [{ mode: 'block_all', keysCreatedBefore: '2026-11-19T24:00:00.000Z' }, 'must be a UTC date and time'],
        [{ mode: 'block_all', keysCreatedBefore: '2026-11-19' }, 'must be a UTC date and time'],
        [{ mode: 'block_all', keysCreatedBefore: '2026-11-19T06:00:00+02:00' }, 'must be a UTC date and time'],
        [{ mode: 'block_all', keysCreatedBefore: '2026-11-20T00:00:00.000Z' }, 'is in the future'],
      ];

      for (const [value, problem] of cases) {
        const parsed = parseApiKeyRevocationPolicy(value, NOW);

        expect(parsed.policy.mode, JSON.stringify(value)).to.equal(ApiKeyRevocationModeEnum.OFF);
        expect(parsed.problems, JSON.stringify(value)).to.have.length(1);
        expect(parsed.problems[0]).to.contain(problem);
      }
    });

    it('keeps the event trigger routes when no routes are listed', () => {
      const policy = policyFor({ mode: 'block_except_allowed', keysCreatedBefore: CUTOFF });

      expect(policy.mode !== ApiKeyRevocationModeEnum.OFF && [...policy.allowedRoutes]).to.deep.equal([
        ...DEFAULT_ALLOWED_ROUTES,
      ]);
    });

    it('normalizes the listed routes and reports the ones it cannot read', () => {
      const parsed = parseApiKeyRevocationPolicy(
        {
          mode: 'block_except_allowed',
          keysCreatedBefore: CUTOFF,
          allowedRoutes: ['post  /v1/events/trigger/', 'PUT /api/v1/subscribers/:subscriberId', 'trigger', 42],
        },
        NOW
      );

      expect(parsed.policy.mode !== ApiKeyRevocationModeEnum.OFF && [...parsed.policy.allowedRoutes]).to.deep.equal([
        'POST /v1/events/trigger',
        'PUT /v1/subscribers/:subscriberId',
      ]);
      expect(parsed.problems).to.have.length(2);
    });

    it('keeps the default routes when allowedRoutes is not a list', () => {
      const parsed = parseApiKeyRevocationPolicy(
        { mode: 'block_except_allowed', keysCreatedBefore: CUTOFF, allowedRoutes: 'POST /v1/events/trigger' },
        NOW
      );

      expect(parsed.policy.mode !== ApiKeyRevocationModeEnum.OFF && parsed.policy.allowedRoutes.size).to.equal(
        DEFAULT_ALLOWED_ROUTES.length
      );
      expect(parsed.problems).to.have.length(1);
    });
  });

  describe('getApiKeyCreatedAt', () => {
    it('reads the creation time from an ObjectId hex string or an ObjectId', () => {
      const id = objectIdCreatedAt(BEFORE_CUTOFF);

      expect(getApiKeyCreatedAt(id)?.toISOString()).to.equal(BEFORE_CUTOFF.toISOString());
      expect(getApiKeyCreatedAt({ toString: () => id })?.toISOString()).to.equal(BEFORE_CUTOFF.toISOString());
    });

    it('is null without a usable id', () => {
      for (const id of [undefined, null, '', 'not-an-object-id', 123]) {
        expect(getApiKeyCreatedAt(id), String(id)).to.equal(null);
      }
    });
  });

  describe('evaluateApiKeyRequest', () => {
    const blockExceptAllowed = policyFor({ mode: 'block_except_allowed', keysCreatedBefore: CUTOFF });
    const blockAll = policyFor({ mode: 'block_all', keysCreatedBefore: CUTOFF });
    const warn = policyFor({ mode: 'warn', keysCreatedBefore: CUTOFF });

    it('never limits a key while the policy is off', () => {
      expect(evaluateApiKeyRequest(policyFor(undefined), BEFORE_CUTOFF, 'GET', '/v1/subscribers')).to.deep.equal({
        requiresRotation: false,
        blocked: false,
      });
    });

    it('never limits a key created at or after the cutoff', () => {
      expect(evaluateApiKeyRequest(blockAll, AFTER_CUTOFF, 'GET', '/v1/subscribers')).to.deep.equal({
        requiresRotation: false,
        blocked: false,
      });
      expect(evaluateApiKeyRequest(blockAll, new Date(CUTOFF), 'GET', '/v1/subscribers').blocked).to.equal(false);
    });

    it('only asks for rotation in warn mode', () => {
      expect(evaluateApiKeyRequest(warn, BEFORE_CUTOFF, 'GET', '/v1/subscribers')).to.deep.equal({
        requiresRotation: true,
        blocked: false,
      });
    });

    it('keeps the trigger and agent reply routes and blocks everything else in block_except_allowed mode', () => {
      const allowed: Array<[string, string]> = [
        ['POST', '/v1/events/trigger'],
        ['post', '/v1/events/trigger/bulk'],
        ['POST', '/v1/events/trigger/broadcast'],
        ['DELETE', '/v1/events/trigger/:transactionId'],
        ['POST', '/api/v1/events/trigger'],
        ['POST', '/v1/events/trigger/'],
        ['POST', '/v1/agents/events/ingest'],
        ['POST', '/v1/agents/:agentId/reply'],
      ];
      const blocked: Array<[string, string]> = [
        ['GET', '/v1/subscribers'],
        ['GET', '/v1/environments/api-keys'],
        ['GET', '/v1/events/trigger'],
        ['POST', '/v1/events/test/email'],
        ['GET', '/v2/subscribers/:subscriberId'],
        ['POST', '/v1/agents'],
        ['PATCH', '/v1/agents/:identifier'],
      ];

      for (const [method, path] of allowed) {
        expect(evaluateApiKeyRequest(blockExceptAllowed, BEFORE_CUTOFF, method, path).blocked, `${method} ${path}`).to
          .be.false;
      }

      for (const [method, path] of blocked) {
        expect(evaluateApiKeyRequest(blockExceptAllowed, BEFORE_CUTOFF, method, path).blocked, `${method} ${path}`).to
          .be.true;
      }
    });

    it('blocks every route in block_all mode', () => {
      expect(evaluateApiKeyRequest(blockAll, BEFORE_CUTOFF, 'POST', '/v1/events/trigger').blocked).to.equal(true);
    });

    it('treats a key without a known creation time as created before the cutoff', () => {
      expect(requiresRotation(blockAll, null)).to.equal(true);
      expect(evaluateApiKeyRequest(blockAll, null, 'POST', '/v1/events/trigger').blocked).to.equal(true);
    });
  });

  describe('canSignWithApiKey', () => {
    it('keeps every key signing outside block_all mode', () => {
      for (const mode of ['off', 'warn', 'block_except_allowed']) {
        const policy = policyFor({ mode, keysCreatedBefore: CUTOFF });

        expect(canSignWithApiKey(policy, BEFORE_CUTOFF), mode).to.equal(true);
        expect(canSignWithApiKey(policy, null), mode).to.equal(true);
      }
    });

    it('stops keys created before the cutoff from signing in block_all mode', () => {
      const blockAll = policyFor({ mode: 'block_all', keysCreatedBefore: CUTOFF });

      expect(canSignWithApiKey(blockAll, BEFORE_CUTOFF)).to.equal(false);
      expect(canSignWithApiKey(blockAll, null)).to.equal(false);
      expect(canSignWithApiKey(blockAll, AFTER_CUTOFF)).to.equal(true);
      expect(canSignWithApiKey(blockAll, new Date(CUTOFF))).to.equal(true);
    });
  });

  describe('getRevokedApiKeyMessage', () => {
    it('says the key can still trigger while trigger routes are allowed', () => {
      expect(getRevokedApiKeyMessage(policyFor({ mode: 'block_except_allowed', keysCreatedBefore: CUTOFF }))).to.equal(
        TRIGGER_ONLY_API_KEY_MESSAGE
      );
    });

    it('says the key was revoked when nothing is allowed', () => {
      expect(getRevokedApiKeyMessage(policyFor({ mode: 'block_all', keysCreatedBefore: CUTOFF }))).to.equal(
        REVOKED_API_KEY_MESSAGE
      );
      expect(
        getRevokedApiKeyMessage(
          policyFor({ mode: 'block_except_allowed', keysCreatedBefore: CUTOFF, allowedRoutes: [] })
        )
      ).to.equal(REVOKED_API_KEY_MESSAGE);
    });
  });

  describe('hashApiKeyFromHeader', () => {
    it('hashes the key the way it is stored', () => {
      expect(hashApiKeyFromHeader('ApiKey secret-value')).to.equal(
        createHash('sha256').update('secret-value').digest('hex')
      );
    });

    it('ignores other schemes and empty keys', () => {
      for (const header of [undefined, '', 'Bearer token', 'ApiKey ', 'apikey secret-value', ['ApiKey x']]) {
        expect(hashApiKeyFromHeader(header), JSON.stringify(header)).to.equal(null);
      }
    });
  });

  describe('normalizeRoutePath', () => {
    it('drops a context path and a trailing slash', () => {
      expect(normalizeRoutePath('/api/v1/events/trigger/')).to.equal('/v1/events/trigger');
      expect(normalizeRoutePath('/v2/subscribers')).to.equal('/v2/subscribers');
      expect(normalizeRoutePath('/')).to.equal('/');
    });
  });
});
