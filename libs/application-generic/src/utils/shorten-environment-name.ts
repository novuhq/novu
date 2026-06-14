import { EnvironmentEnum } from '@novu/shared';

export type ShortEnvironmentName = 'prod' | 'dev';

export function shortenEnvironmentName(name: string): ShortEnvironmentName {
  if (name === EnvironmentEnum.PRODUCTION) {
    return 'prod';
  }

  if (name === EnvironmentEnum.DEVELOPMENT) {
    return 'dev';
  }

  throw new Error(`Unsupported environment name: ${name}`);
}
