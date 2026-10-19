import { EnvironmentEnum } from '@novu/shared';

export function shortenEnvironmentName(name: string): string {
  if (name === EnvironmentEnum.PRODUCTION) {
    return 'prod';
  }

  if (name === EnvironmentEnum.DEVELOPMENT) {
    return 'dev';
  }

  return name;
}
