import {
  ConnectionOptions,
  IEnvironmentConfigOptions,
  InMemoryProviderEnum,
  IProviderConfiguration,
  IRedisConfigOptions,
  Redis,
} from '../shared/types';
import { InMemoryProvider } from './in-memory-provider';
import { convertStringValues } from '../shared/variable-mappers';

interface IRedisConfig {
  db?: string;
  connectTimeout?: string;
  family?: string;
  host?: string;
  keepAlive?: string;
  keyPrefix?: string;
  password?: string;
  port?: string;
  tls?: ConnectionOptions;
  ttl?: string;
  username?: string;
}

export interface IRedisProviderConfig {
  db?: number;
  connectTimeout: number;
  family: number;
  host?: string;
  keepAlive: number;
  keyPrefix: string;
  username?: string;
  options?: IRedisConfigOptions;
  password?: string;
  port?: number;
  tls?: ConnectionOptions;
  ttl: number;
}

export class RedisProvider extends InMemoryProvider {
  LOG_CONTEXT = 'RedisProvider';
  config: IRedisProviderConfig;
  isCluster = false;
  providerId = InMemoryProviderEnum.REDIS;
  protected client: Redis;

  initialize(): boolean {
    const { port, host, options, ...configRest } = this.config;

    const { showFriendlyErrorStack } = options || {};

    const redisOptions = {
      ...configRest,
      showFriendlyErrorStack,
    };

    this.client = new Redis(port, host, redisOptions);

    return true;
  }
  getProviderId(): InMemoryProviderEnum {
    return this.providerId;
  }

  validateConfig(): boolean {
    return !!this.config.host && !!this.config.port;
  }
  setConfig(config: IProviderConfiguration) {
    this.config = this.getRedisProviderConfig(
      config.envOptions,
      config.options
    );
  }

  public isClientReady = (): boolean =>
    this.client.status === this.CLIENT_READY;

  protected getRedisProviderConfig = (
    envOptions?: IEnvironmentConfigOptions,
    options?: IRedisConfigOptions
  ): IRedisProviderConfig => {
    let redisConfig: Partial<IRedisConfig>;

    if (envOptions) {
      redisConfig = {
        host: convertStringValues(envOptions.host),
        password: convertStringValues(envOptions.password),
        port: convertStringValues(envOptions.ports),
        username: convertStringValues(envOptions.username),
      };
    } else {
      redisConfig = {
        host: convertStringValues(process.env.REDIS_HOST),
        password: convertStringValues(process.env.REDIS_PASSWORD),
        port: convertStringValues(process.env.REDIS_PORT),
        username: convertStringValues(process.env.REDIS_USERNAME),
      };
    }

    redisConfig = {
      ...redisConfig,
      db: convertStringValues(process.env.REDIS_DB_INDEX),
      ttl: convertStringValues(process.env.REDIS_TTL),
      connectTimeout: convertStringValues(process.env.REDIS_CONNECT_TIMEOUT),
      keepAlive: convertStringValues(process.env.REDIS_KEEP_ALIVE),
      family: convertStringValues(process.env.REDIS_FAMILY),
      keyPrefix: convertStringValues(process.env.REDIS_PREFIX),
      tls: process.env.REDIS_TLS as ConnectionOptions,
    };

    const db = redisConfig.db ? Number(redisConfig.db) : undefined;
    const port = redisConfig.port
      ? Number(redisConfig.port)
      : this.DEFAULT_PORT;
    const host = redisConfig.host || this.DEFAULT_HOST;
    const password = redisConfig.password;
    const username = redisConfig.username;
    const connectTimeout = redisConfig.connectTimeout
      ? Number(redisConfig.connectTimeout)
      : this.DEFAULT_CONNECT_TIMEOUT;
    const family = redisConfig.family
      ? Number(redisConfig.family)
      : this.DEFAULT_FAMILY;
    const keepAlive = redisConfig.keepAlive
      ? Number(redisConfig.keepAlive)
      : this.DEFAULT_KEEP_ALIVE;
    const keyPrefix = redisConfig.keyPrefix ?? this.DEFAULT_KEY_PREFIX;
    const ttl = redisConfig.ttl
      ? Number(redisConfig.ttl)
      : this.DEFAULT_TTL_SECONDS;
    const tls = redisConfig.tls;

    return {
      db,
      host,
      port,
      password,
      username,
      connectTimeout,
      family,
      keepAlive,
      keyPrefix,
      ttl,
      tls,
      ...(options && { options }),
    };
  };
}
