import { Injectable, Logger } from '@nestjs/common';
import { SystemCriticalFlagsEnum } from '@novu/shared';

const LOG_CONTEXT = 'GetSystemCriticalFlag';

@Injectable()
export class GetSystemCriticalFlag {
  protected log<T>(key: SystemCriticalFlagsEnum, value: T): void {
    Logger.log(
      `System critical flag ${key} is set with value ${JSON.stringify(value)}`,
      LOG_CONTEXT
    );
  }

  protected prepareBooleanStringSystemCriticalFlag(
    value: string | undefined,
    defaultValue: boolean
  ): boolean {
    if (!value) {
      return defaultValue;
    }

    return value === 'true';
  }
}
