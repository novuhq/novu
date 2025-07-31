declare namespace NodeJS {
  export interface ProcessEnv {
    REDIS_URL: string;
    REDIS_ARENA_PORT: string;
    NODE_ENV: 'test' | 'production' | 'dev';
    MONGO_MIN_POOL_SIZE: number;
    MONGO_MAX_POOL_SIZE: number;
    NOTIFICATION_RETENTION_DAYS?: number;
  }
}
