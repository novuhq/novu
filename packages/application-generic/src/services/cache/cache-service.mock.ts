import { CachingConfig, ICacheService } from './cache.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const MockCacheService = {
  createClient(): ICacheService {
    const data = {};

    return {
      set(key: string, value: string, options?: CachingConfig) {
        data[key] = value;
      },
      get(key: string) {
        return data[key];
      },
      del(key: string) {
        delete data[key];

        return;
      },
      delByPattern(pattern?: string) {
        const preFixSuffixTuple = pattern?.split('*');

        if (!preFixSuffixTuple) return;

        for (const key in data) {
          if (
            key.startsWith(preFixSuffixTuple[0]) &&
            key.endsWith(preFixSuffixTuple[1])
          )
            delete data[key];
        }

        return;
      },
      keys(pattern?: string) {
        return Object.keys(data);
      },
      getStatus() {
        return 'ready';
      },
      cacheEnabled() {
        return true;
      },
      async sadd(key, ...members) {
        data[key] = members;

        return members.length;
      },
      async eval<TArgs extends (string | Buffer | number)[], TData = unknown>(
        script: string,
        keys: string[],
        ...args: TArgs
      ): Promise<TData> {
        return 'OK' as TData;
      },
    };
  },
};
