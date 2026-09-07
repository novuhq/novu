import type { ValidatedEnv } from '../config';

declare global {
  namespace NodeJS {
    interface ProcessEnv extends ValidatedEnv {
      NODE_ENV: 'test' | 'production' | 'dev' | 'ci' | 'local';
    }
  }
}
