import type { ConnectionOptions } from 'tls';

declare global {
  declare namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    export interface ProcessEnv {
      NODE_ENV: 'test' | 'prod' | 'dev' | 'ci' | 'local';
      PORT: string;
      REDIS_HOST: string;
      REDIS_PORT: number;
      REDIS_TLS?: ConnectionOptions;
      REDIS_DB_INDEX: number;
      MONGO_URL: string;
      NEW_RELIC_APP_NAME: string;
      NEW_RELIC_LICENSE_KEY: string;
      SEGMENT_TOKEN?: string;
    }
  }
}
