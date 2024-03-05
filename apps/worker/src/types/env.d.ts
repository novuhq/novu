import type { ConnectionOptions } from 'tls';

declare global {
  declare namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    export interface ProcessEnv {
      NODE_ENV: 'test' | 'production' | 'dev' | 'ci' | 'local';
      PORT: string;
      STORE_ENCRYPTION_KEY: string;
      STORE_NOTIFICATION_CONTENT: string;
      MAX_NOVU_INTEGRATION_MAIL_REQUESTS?: string;
      NOVU_EMAIL_INTEGRATION_API_KEY?: string;
      STORAGE_SERVICE?: string;
      METRICS_SERVICE?: string;
      REDIS_HOST: string;
      REDIS_PORT: number;
      REDIS_PASSWORD?: string;
      REDIS_TLS?: ConnectionOptions;
      REDIS_DB_INDEX: number;
      REDIS_CACHE_SERVICE_HOST?: string;
      REDIS_CACHE_SERVICE_PORT?: string;
      REDIS_CACHE_DB_INDEX?: string;
      REDIS_CACHE_TTL?: string;
      REDIS_CACHE_PASSWORD?: string;
      REDIS_CACHE_CONNECTION_TIMEOUT?: string;
      REDIS_CACHE_KEEP_ALIVE?: string;
      REDIS_CACHE_FAMILY?: string;
      REDIS_CACHE_KEY_PREFIX?: string;
      REDIS_CACHE_SERVICE_TLS?: ConnectionOptions;
      MONGO_URL: string;
      MONGO_MIN_POOL_SIZE: number;
      MONGO_MAX_POOL_SIZE: number;
      NEW_RELIC_APP_NAME: string;
      NEW_RELIC_LICENSE_KEY: string;
      SEGMENT_TOKEN?: string;
      LAUNCH_DARKLY_SDK_KEY?: string;
      STRIPE_API_KEY: string;
      NOTIFICATION_RETENTION_DAYS?: number;
      MESSAGE_GENERIC_RETENTION_DAYS?: number;
      MESSAGE_IN_APP_RETENTION_DAYS?: number;
    }
  }
}
