import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { EnvironmentRepository, IApiKey } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { LRUCache } from 'lru-cache';
import { addNewRelicApiKeyRevocationAttributes } from '../services/passport/newrelic.util';
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
   * The environment's stored (encrypted) keys whose subscriber and context hashes still count. In `block_all` a key
   * created before the cutoff is left out, so a leaked key can no longer open an Inbox or update a subscriber
   * through it.
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
    const policy = await this.getPolicy({ organizationId, environmentId });

    return apiKeys
      .filter((apiKey) => canSignWithApiKey(policy, getApiKeyCreatedAt((apiKey as StoredApiKey)._id)))
      .map((apiKey) => apiKey.key);
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
