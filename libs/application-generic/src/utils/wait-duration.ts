import { TimeUnitEnum } from '@novu/shared';
import { DEFAULT_WAIT_AMOUNT, DEFAULT_WAIT_UNIT } from '../schemas/control/wait-control.schema';
import { DurationUtils } from './duration-utils';

const EXPIRES_IN_PATTERN = /^(\d+(?:\.\d+)?)(s|m|h|d|w)$/i;

const EXPIRES_IN_UNIT: Record<string, TimeUnitEnum> = {
  s: TimeUnitEnum.SECONDS,
  m: TimeUnitEnum.MINUTES,
  h: TimeUnitEnum.HOURS,
  d: TimeUnitEnum.DAYS,
  w: TimeUnitEnum.WEEKS,
};

export function waitDurationMs(amount?: number, unit?: string): number {
  const resolvedAmount = amount && amount > 0 ? amount : DEFAULT_WAIT_AMOUNT;
  const resolvedUnit = unit || DEFAULT_WAIT_UNIT;

  return DurationUtils.convertToMilliseconds(resolvedAmount, resolvedUnit);
}

export function parseExpiresIn(expiresIn: string): { amount: number; unit: TimeUnitEnum } | null {
  const match = EXPIRES_IN_PATTERN.exec(expiresIn.trim());
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = EXPIRES_IN_UNIT[match[2].toLowerCase()];
  if (!Number.isFinite(amount) || amount <= 0 || !unit) {
    return null;
  }

  return { amount, unit };
}

export function resolveWaitDuration(output: { amount?: number; unit?: string; expiresIn?: string }): number {
  if (output.expiresIn) {
    const parsed = parseExpiresIn(output.expiresIn);
    if (parsed) {
      return waitDurationMs(parsed.amount, parsed.unit);
    }
  }

  return waitDurationMs(output.amount, output.unit);
}
