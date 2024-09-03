import { DigestTypeEnum } from '@novu/shared';
import {
  DigestOutput,
  DigestRegularOutput,
  DigestTimedOutput,
} from '@novu/framework';

export function getDigestType(outputs: DigestOutput): DigestTypeEnum {
  if (isTimedDigestOutput(outputs)) {
    return DigestTypeEnum.TIMED;
  } else if (isLookBackDigestOutput(outputs)) {
    return DigestTypeEnum.BACKOFF;
  }

  return DigestTypeEnum.REGULAR;
}

export const isTimedDigestOutput = (
  outputs: DigestOutput | undefined,
): outputs is DigestTimedOutput => {
  return (outputs as DigestTimedOutput)?.cron != null;
};

export const isLookBackDigestOutput = (
  outputs: DigestOutput,
): outputs is DigestRegularOutput => {
  return (
    (outputs as DigestRegularOutput)?.lookBackWindow?.amount != null &&
    (outputs as DigestRegularOutput)?.lookBackWindow?.unit != null
  );
};

export const isRegularDigestOutput = (
  outputs: DigestOutput,
): outputs is DigestRegularOutput => {
  return !isTimedDigestOutput(outputs) && !isLookBackDigestOutput(outputs);
};
