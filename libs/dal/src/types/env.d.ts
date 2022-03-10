declare namespace NodeJS {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  export interface ProcessEnv {
    REDIS_URL: string;
    REDIS_ARENA_PORT: string;
    NODE_ENV: 'test' | 'prod' | 'dev';
  }
}
