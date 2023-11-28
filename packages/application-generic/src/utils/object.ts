import { Logger } from '@nestjs/common';

const LOG_CONTEXT = 'GetNestedValue';

export function getNestedValue<ObjectType>(
  payload: ObjectType,
  path?: string
): ObjectType | undefined {
  if (!path || !payload) {
    return undefined;
  }

  try {
    let result = payload;
    const keys = path.split('.');

    for (const key of keys) {
      if (result === undefined) {
        return undefined;
      }
      result = result[key];
    }

    return result;
  } catch (error) {
    Logger.error(
      error,
      'Failure when parsing digest payload nested key',
      LOG_CONTEXT
    );

    return undefined;
  }
}
