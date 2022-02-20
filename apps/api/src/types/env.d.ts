declare namespace NodeJS {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  export interface ProcessEnv {
    MONGO_URL: string;
    REDIS_URL: string;
    SYNC_PATH: string;
    GOOGLE_OAUTH_CLIENT_SECRET: string;
    GOOGLE_OAUTH_CLIENT_ID: string;
    NODE_ENV: 'test' | 'prod' | 'dev' | 'ci' | 'local';
    PORT: string;
    FRONT_BASE_URL: string;
    SENTRY_DSN: string;
  }
}
