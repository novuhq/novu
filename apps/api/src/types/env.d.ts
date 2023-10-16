declare namespace NodeJS {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  export interface ProcessEnv {
    MONGO_URL: string;
    MONGO_MIN_POOL_SIZE: number;
    MONGO_MAX_POOL_SIZE: number;
    REDIS_URL: string;
    SYNC_PATH: string;
    GOOGLE_OAUTH_CLIENT_SECRET: string;
    GOOGLE_OAUTH_CLIENT_ID: string;
    NODE_ENV: 'test' | 'production' | 'dev' | 'ci' | 'local';
    PORT: string;
    DISABLE_USER_REGISTRATION: 'true' | 'false';
    FRONT_BASE_URL: string;
    SENTRY_DSN: string;
  }
}
