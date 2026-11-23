import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { EnvironmentRepository, IApiKey } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { LRUCache } from 'lru-cache';
import { isHmacValidForAnyKey } from '../../shared/helpers/is-valid-hmac';
import { SubscriberSessionSourceEnum } from '../../shared/services/subscriber-session-auth-stats.service';
import {
  addNewRelicApiKeyRevocationAttributes,
  addNewRelicOldKeyHashAttributes,
} from '../services/passport/newrelic.util';
import {
  ApiKeyRevocationModeEnum,
  ApiKeyRevocationPolicy,
  canSignWithApiKey,
  evaluateApiKeyRequest,
  getApiKeyCreatedAt,
  getRevokedApiKeyMessage,
  hashApiKeyFromHeader,
  normalizeRoutePath,
  parseApiKeyRevocationPolicy,
  requiresRotation,
} from './api-key-revocation.policy';

/** Stored keys carry the `_id` Mongoose gives every array entry, which `IApiKey` does not declare. */
type StoredApiKey = IApiKey & { _id?: unknown };

/*
 * A key's creation time never changes, so one lookup per key and instance an hour is enough. Shared by every
 * instance of the service.
 */
const keyCreatedAtCache = new LRUCache<string, { createdAt: Date | null }>({ max: 50_000, ttl: 60 * 60 * 1000 });

/*
 * Parsed flag values, keyed by the raw value. The short TTL lets a cutoff that was still in the future take effect
 * once it passes, and keeps a bad value from being logged on every call.
 */
const parsedPolicyCache = new LRUCache<string, ApiKeyRevocationPolicy>({ max: 100, ttl: 60 * 1000 });

/*
 * Calls made with a key created before the cutoff that were logged in the last ten minutes, by key, route and outcome.
 * At first nearly every key is that old, so a line per call would log most of the API's traffic. One line per ten
 * minutes and instance still shows which environments use such a key and where; the New Relic transaction attributes
 * keep the exact counts.
 */
const loggedOldKeyCalls = new LRUCache<string, true>({ max: 50_000, ttl: 10 * 60 * 1000 });

/*
 * Subscriber hashes signed with a key created before the cutoff that were logged in the last ten minutes, by
 * environment, session source and outcome. Inbox sessions are frequent, so one line per ten minutes and instance is
 * enough to list the environments that still sign with such a key; the New Relic attributes keep the exact counts.
 */
const loggedOldKeyHashes = new LRUCache<string, true>({ max: 50_000, ttl: 10 * 60 * 1000 });

type RevocationRequest = {
  organizationId: string;
  environmentId: string;
  authorization: unknown;
  method: string;
  routePath: string;
};

/**
 * Limits secret keys created before the cutoff in the `API_KEY_REVOCATION_POLICY` flag, so they can be revoked
 * without being deleted. The flag is read per organization, which lets LaunchDarkly targeting stage the rollout.
 */
@Injectable()
export class ApiKeyRevocationService {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async getPolicy({
    organizationId,
    environmentId,
  }: {
    organizationId: string;
    environmentId: string;
  }): Promise<ApiKeyRevocationPolicy> {
    const raw = await this.featureFlagsService.getFlag<unknown>({
      key: FeatureFlagsKeysEnum.API_KEY_REVOCATION_POLICY,
      // A string default lets the environment variable flag service hand a JSON string through.
      defaultValue: '',
      organization: { _id: organizationId },
      environment: { _id: environmentId },
      component: 'api',
    });

    return this.toPolicy(raw);
  }

  /** Whether a key stored on the environment was created before the cutoff and has to be replaced. */
  isRotationRequired(policy: ApiKeyRevocationPolicy, apiKey: IApiKey): boolean {
    return requiresRotation(policy, getApiKeyCreatedAt((apiKey as StoredApiKey)._id));
  }

  /**
   * The environment's stored (encrypted) keys whose subscriber and context hashes still count. A key created before
   * the cutoff is left out in `block_all`, and in `block_except_allowed` while
   * `IS_API_KEY_REVOCATION_HMAC_BLOCK_ENABLED` is on, so a leaked key can no longer open an Inbox or update a
   * subscriber through it.
   */
  async getSigningKeys({
    organizationId,
    environmentId,
    apiKeys,
  }: {
    organizationId: string;
    environmentId: string;
    apiKeys: IApiKey[];
  }): Promise<string[]> {
    const [policy, isHmacBlockEnabled] = await Promise.all([
      this.getPolicy({ organizationId, environmentId }),
      this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_API_KEY_REVOCATION_HMAC_BLOCK_ENABLED,
        defaultValue: false,
        organization: { _id: organizationId },
        environment: { _id: environmentId },
        component: 'api',
      }),
    ]);

    return apiKeys
      .filter((apiKey) =>
        canSignWithApiKey(policy, getApiKeyCreatedAt((apiKey as StoredApiKey)._id), isHmacBlockEnabled)
      )
      .map((apiKey) => apiKey.key);
  }

  /**
   * Records a session whose subscriber hash was signed with a key created before the cutoff, so the organizations
   * still signing with such a key can be counted: New Relic attributes on every such session and a throttled log line.
   * `signingKeys` are the keys the session accepted (`getSigningKeys`), which tells whether the old key still counted
   * or the hash was rejected. A missing or wrong hash, or one signed with a newer key, is not recorded.
   */
  async recordOldKeySubscriberHash({
    organizationId,
    environmentId,
    apiKeys,
    signingKeys,
    subscriberId,
    subscriberHash,
    source,
  }: {
    organizationId: string;
    environmentId: string;
    apiKeys: IApiKey[];
    signingKeys: string[];
    subscriberId: string;
    subscriberHash: string | undefined;
    source: SubscriberSessionSourceEnum;
  }): Promise<void> {
    if (!subscriberHash) {
      return;
    }

    try {
      const policy = await this.getPolicy({ organizationId, environmentId });
      const oldKey = apiKeys.find(
        (apiKey) =>
          requiresRotation(policy, getApiKeyCreatedAt((apiKey as StoredApiKey)._id)) &&
          isHmacValidForAnyKey([apiKey.key], subscriberId, subscriberHash)
      );

      if (!oldKey) {
        return;
      }

      const blocked = !signingKeys.includes(oldKey.key);

      addNewRelicOldKeyHashAttributes({ blocked, source, organizationId, environmentId });
      this.logOldKeyHash({ organizationId, environmentId, source, mode: policy.mode, blocked });
    } catch (err) {
      // Recording must never fail the session it describes.
      this.logger.error(
        { err, organizationId, environmentId },
        'Failed to record a subscriber hash signed with an old key'
      );
    }
  }

  /** Throws when the policy revokes the key the request was authenticated with, for this route. */
  async assertRequestAllowed({
    organizationId,
    environmentId,
    authorization,
    method,
    routePath,
  }: RevocationRequest): Promise<void> {
    const policy = await this.getPolicy({ organizationId, environmentId });

    if (policy.mode === ApiKeyRevocationModeEnum.OFF) {
      return;
    }

    const apiKeyHash = hashApiKeyFromHeader(authorization);
    const keyCreatedAt = apiKeyHash ? await this.getKeyCreatedAt(apiKeyHash) : null;
    const evaluation = evaluateApiKeyRequest(policy, keyCreatedAt, method, routePath);

    if (!evaluation.requiresRotation) {
      return;
    }

    addNewRelicApiKeyRevocationAttributes({ blocked: evaluation.blocked });
    this.logOldKeyCall({
      organizationId,
      environmentId,
      apiKeyHash,
      method,
      routePath,
      mode: policy.mode,
      blocked: evaluation.blocked,
    });

    if (evaluation.blocked) {
      throw new UnauthorizedException(getRevokedApiKeyMessage(policy));
    }
  }

  /** `null` when no key has this hash any more, which counts as created before the cutoff. */
  async getKeyCreatedAt(apiKeyHash: string): Promise<Date | null> {
    const cached = keyCreatedAtCache.get(apiKeyHash);

    if (cached) {
      return cached.createdAt;
    }

    const environment = await this.environmentRepository.findOne({ 'apiKeys.hash': apiKeyHash }, 'apiKeys', {
      // A key created seconds ago may not have reached a secondary yet.
      readPreference: 'primary',
    });
    const storedKey = (environment?.apiKeys as StoredApiKey[] | undefined)?.find(
      (apiKey) => apiKey.hash === apiKeyHash
    );

    // Not cached, so a key that was missing for a moment is looked up again on the next call.
    if (!storedKey) {
      return null;
    }

    const createdAt = getApiKeyCreatedAt(storedKey._id);
    keyCreatedAtCache.set(apiKeyHash, { createdAt });

    return createdAt;
  }

  /** Logs the flags the New Relic transaction gets, once per key, route and outcome in ten minutes. */
  private logOldKeyCall({
    organizationId,
    environmentId,
    apiKeyHash,
    method,
    routePath,
    mode,
    blocked,
  }: Omit<RevocationRequest, 'authorization'> & {
    apiKeyHash: string | null;
    mode: ApiKeyRevocationModeEnum;
    blocked: boolean;
  }): void {
    const route = `${method.toUpperCase()} ${normalizeRoutePath(routePath)}`;
    const loggedCallKey = `${apiKeyHash} ${route} ${blocked}`;

    if (loggedOldKeyCalls.has(loggedCallKey)) {
      return;
    }

    loggedOldKeyCalls.set(loggedCallKey, true);
    this.logger.warn(
      {
        apiKeyRequiresRotation: true,
        apiKeyRevocationBlocked: blocked,
        apiKeyRevocationMode: mode,
        organizationId,
        environmentId,
        route,
      },
      blocked
        ? 'Rejected a call made with a revoked secret key'
        : 'Allowed a call made with a secret key that has to be replaced'
    );
  }

  /** Logs the New Relic flags of a subscriber hash signed with an old key, once per environment, source and outcome. */
  private logOldKeyHash({
    organizationId,
    environmentId,
    source,
    mode,
    blocked,
  }: {
    organizationId: string;
    environmentId: string;
    source: SubscriberSessionSourceEnum;
    mode: ApiKeyRevocationModeEnum;
    blocked: boolean;
  }): void {
    const loggedHashKey = `${environmentId} ${source} ${blocked}`;

    if (loggedOldKeyHashes.has(loggedHashKey)) {
      return;
    }

    loggedOldKeyHashes.set(loggedHashKey, true);
    this.logger.warn(
      {
        apiKeyRequiresRotation: true,
        apiKeyRevocationBlocked: blocked,
        apiKeyRevocationMode: mode,
        apiKeyRevocationHashSource: source,
        organizationId,
        environmentId,
      },
      blocked
        ? 'Rejected a subscriber hash signed with a revoked secret key'
        : 'Accepted a subscriber hash signed with a secret key that has to be replaced'
    );
  }

  private toPolicy(raw: unknown): ApiKeyRevocationPolicy {
    const cacheKey = typeof raw === 'string' ? raw : JSON.stringify(raw ?? null);
    const cached = parsedPolicyCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const { policy, problems } = parseApiKeyRevocationPolicy(raw);

    if (problems.length > 0) {
      this.logger.error({ problems, value: raw }, `${FeatureFlagsKeysEnum.API_KEY_REVOCATION_POLICY} has problems`);
    }

    parsedPolicyCache.set(cacheKey, policy);

    return policy;
  }
}
