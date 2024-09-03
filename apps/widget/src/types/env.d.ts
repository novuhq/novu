declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'test' | 'production' | 'dev' | 'ci' | 'local';
    }
  }
}
