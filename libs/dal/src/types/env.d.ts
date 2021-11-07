declare namespace NodeJS {
  export interface ProcessEnv {
    REDIS_URL: string;
    REDIS_ARENA_PORT: string;
    NODE_ENV: 'test' | 'prod' | 'dev';
  }
}
