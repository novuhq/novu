import { Injectable } from '@nestjs/common';
import { SystemCriticalFlagsEnum } from '@novu/shared';

import { GetSystemCriticalFlag } from './get-system-critical-flag.use-case';

@Injectable()
export class GetIsRequestRateLimitingEnabled extends GetSystemCriticalFlag {
  execute(): boolean {
    const value = process.env.IS_REQUEST_RATE_LIMITING_ENABLED;
    const fallbackValue = false;
    const defaultValue = this.prepareBooleanStringSystemCriticalFlag(
      value,
      fallbackValue
    );
    const key = SystemCriticalFlagsEnum.IS_REQUEST_RATE_LIMITING_ENABLED;

    this.log<boolean>(key, defaultValue);

    return defaultValue;
  }
}
