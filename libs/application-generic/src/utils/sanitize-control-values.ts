import { StepTypeEnum, TimeUnitEnum } from '@novu/shared';
import { isEmpty } from 'lodash';
import {
  InAppActionType,
  InAppControlType,
} from '../schemas/control/in-app-control.schema';
import {
  EmailControlType,
  SmsControlType,
  InAppRedirectType,
  PushControlType,
  DigestTimedControlType,
  DigestControlSchemaType,
  DigestRegularControlType,
  LookBackWindowType,
  DelayControlType,
  ChatControlType,
} from '../schemas/control';
import { PinoLogger } from '../logging';

// Cast input T_Type to trigger Ajv validation errors - possible undefined
function sanitizeEmptyInput<T_Type>(
  input: T_Type,
  defaultValue: T_Type = undefined as unknown as T_Type,
): T_Type {
  return isEmpty(input) ? defaultValue : input;
}

export function sanitizeRedirect(redirect: InAppRedirectType | undefined) {
  if (!redirect?.url || redirect.url.length === 0 || !redirect?.target) {
    return undefined;
  }

  return {
    url: redirect.url as string,
    target: redirect.target as
      | '_self'
      | '_blank'
      | '_parent'
      | '_top'
      | '_unfencedTop',
  };
}

function sanitizeAction(action: InAppActionType) {
  if (!action?.label) {
    return undefined;
  }

  return {
    label: action.label as string,
    redirect: sanitizeRedirect(action.redirect) as InAppRedirectType,
  };
}

function sanitizeInApp(controlValues: InAppControlType) {
  const normalized: InAppControlType = {
    subject: controlValues.subject,
    body: sanitizeEmptyInput<string>(controlValues.body),
    avatar: sanitizeEmptyInput<string>(controlValues.avatar),
    primaryAction: undefined,
    secondaryAction: undefined,
    redirect: undefined,
    data: controlValues.data,
    skip: controlValues.skip,
    disableOutputSanitization: controlValues.disableOutputSanitization,
  };

  if (controlValues.primaryAction) {
    normalized.primaryAction = sanitizeAction(
      controlValues.primaryAction as InAppActionType,
    );
  }

  if (controlValues.secondaryAction) {
    normalized.secondaryAction = sanitizeAction(
      controlValues.secondaryAction as InAppActionType,
    );
  }

  if (controlValues.redirect) {
    normalized.redirect = sanitizeRedirect(
      controlValues.redirect as InAppRedirectType,
    );
  }

  return filterNullishValues(normalized);
}

function sanitizeEmail(controlValues: EmailControlType) {
  const EMPTY_TIP_TAP = JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph' }],
  });

  const emailControls: EmailControlType = {
    subject: controlValues.subject,
    body: sanitizeEmptyInput(controlValues.body, EMPTY_TIP_TAP),
    skip: controlValues.skip,
  };

  return filterNullishValues(emailControls);
}

function sanitizeSms(controlValues: SmsControlType) {
  const mappedValues: SmsControlType = {
    body: sanitizeEmptyInput(controlValues.body),
    skip: controlValues.skip,
  };

  return filterNullishValues(mappedValues);
}

function sanitizePush(controlValues: PushControlType) {
  const mappedValues: PushControlType = {
    subject: sanitizeEmptyInput(controlValues.subject),
    body: sanitizeEmptyInput(controlValues.body),
    skip: controlValues.skip,
  };

  return filterNullishValues(mappedValues);
}

function sanitizeChat(controlValues: ChatControlType) {
  const mappedValues: ChatControlType = {
    body: sanitizeEmptyInput(controlValues.body),
    skip: controlValues.skip,
  };

  return filterNullishValues(mappedValues);
}

function sanitizeDigest(controlValues: DigestControlSchemaType) {
  if (isTimedDigestControl(controlValues)) {
    const mappedValues: DigestTimedControlType = {
      cron: controlValues.cron,
      digestKey: controlValues.digestKey,
      skip: controlValues.skip,
    };

    return filterNullishValues(mappedValues);
  }

  if (isRegularDigestControl(controlValues)) {
    const lookBackAmount = (controlValues.lookBackWindow as LookBackWindowType)
      ?.amount;
    const mappedValues: DigestRegularControlType = {
      // Cast to trigger Ajv validation errors - possible undefined
      ...(parseAmount(controlValues.amount) as { amount?: number }),
      unit: controlValues.unit,
      digestKey: controlValues.digestKey,
      skip: controlValues.skip,
      lookBackWindow: controlValues.lookBackWindow
        ? {
            // Cast to trigger Ajv validation errors - possible undefined
            ...(parseAmount(lookBackAmount) as { amount?: number }),
            unit: (controlValues.lookBackWindow as LookBackWindowType).unit,
          }
        : undefined,
    };

    return filterNullishValues(mappedValues);
  }

  const anyControlValues = controlValues as Record<string, unknown>;
  const lookBackWindow = (anyControlValues.lookBackWindow as LookBackWindowType)
    ?.amount;

  return filterNullishValues({
    // Cast to trigger Ajv validation errors - possible undefined
    ...(parseAmount(anyControlValues.amount) as { amount?: number }),
    unit: anyControlValues.unit,
    digestKey: anyControlValues.digestKey,
    skip: anyControlValues.skip,
    lookBackWindow: anyControlValues.lookBackWindow
      ? {
          // Cast to trigger Ajv validation errors - possible undefined
          ...(parseAmount(lookBackWindow) as { amount?: number }),
          unit: (anyControlValues.lookBackWindow as LookBackWindowType).unit,
        }
      : undefined,
  });
}

function sanitizeDelay(controlValues: DelayControlType) {
  const mappedValues: DelayControlType = {
    // Cast to trigger Ajv validation errors - possible undefined
    ...(parseAmount(controlValues.amount) as { amount?: number }),
    type: controlValues.type,
    unit: controlValues.unit,
    skip: controlValues.skip,
  };

  return filterNullishValues(mappedValues);
}

function parseAmount(amount?: unknown) {
  try {
    if (!isNumber(amount)) {
      return {};
    }

    const numberAmount =
      typeof amount === 'string' ? parseInt(amount, 10) : amount;

    return { amount: numberAmount };
  } catch (error) {
    return amount;
  }
}

function filterNullishValues<T extends Record<string, unknown>>(obj: T): T {
  if (typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).filter(
        ([_, value]) => value !== null && value !== undefined,
      ),
    ) as T;
  }

  return obj;
}

/**
 * Sanitizes control values received from client-side forms into a clean minimal object.
 * This function processes potentially invalid form data that may contain default/placeholder values
 * and transforms it into a standardized format suitable for preview generation.
 *
 * @example
 * // Input from form with default values:
 * {
 *   subject: "Hello",
 *   body: null,
 *   unusedField: "test"
 * }
 *
 * // Normalized output:
 * {
 *   subject: "Hello",
 *   body: " "
 * }
 *
 */
export function dashboardSanitizeControlValues(
  logger: PinoLogger,
  controlValues: Record<string, unknown>,
  stepType: StepTypeEnum | unknown,
): (Record<string, unknown> & { skip?: Record<string, unknown> }) | null {
  try {
    if (!controlValues) {
      return null;
    }

    let normalizedValues: Record<string, unknown>;
    switch (stepType) {
      case StepTypeEnum.IN_APP:
        normalizedValues = sanitizeInApp(controlValues as InAppControlType);
        break;
      case StepTypeEnum.EMAIL:
        normalizedValues = sanitizeEmail(controlValues as EmailControlType);
        break;
      case StepTypeEnum.SMS:
        normalizedValues = sanitizeSms(controlValues as SmsControlType);
        break;
      case StepTypeEnum.PUSH:
        normalizedValues = sanitizePush(controlValues as PushControlType);
        break;
      case StepTypeEnum.CHAT:
        normalizedValues = sanitizeChat(controlValues as ChatControlType);
        break;
      case StepTypeEnum.DIGEST:
        normalizedValues = sanitizeDigest(
          controlValues as DigestControlSchemaType,
        );
        break;
      case StepTypeEnum.DELAY:
        normalizedValues = sanitizeDelay(controlValues as DelayControlType);
        break;
      default:
        normalizedValues = filterNullishValues(controlValues);
    }

    return normalizedValues;
  } catch (error) {
    logger.error('Error sanitizing control values', error);

    return controlValues;
  }
}

function isNumber(value: unknown): value is number {
  return !Number.isNaN(Number.parseInt(value as string, 10));
}

function isTimedDigestControl(
  controlValues: unknown,
): controlValues is DigestTimedControlType {
  return !isEmpty((controlValues as DigestTimedControlType)?.cron);
}

function isRegularDigestControl(
  controlValues: unknown,
): controlValues is DigestRegularControlType {
  return !isTimedDigestControl(controlValues);
}
