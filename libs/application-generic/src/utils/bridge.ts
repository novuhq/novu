import { DigestTypeEnum } from '@novu/shared';
import {
  DigestOutput,
  digestRegularOutput,
  digestTimedOutput,
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
  outputs: DigestOutput | undefined
): outputs is digestTimedOutput => {
  return (outputs as digestTimedOutput)?.cron != null;
};

export const isLookBackDigestOutput = (
  outputs: DigestOutput
): outputs is digestRegularOutput => {
  return (
    (outputs as digestRegularOutput)?.lookBackWindow?.amount != null &&
    (outputs as digestRegularOutput)?.lookBackWindow?.unit != null
  );
};

export const isRegularDigestOutput = (
  outputs: DigestOutput
): outputs is digestRegularOutput => {
  return !isTimedDigestOutput(outputs) && !isLookBackDigestOutput(outputs);
};
