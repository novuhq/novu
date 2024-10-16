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

export const BRIDGE_EXECUTION_ERROR = {
  TUNNEL_NOT_FOUND: {
    code: 'TUNNEL_NOT_FOUND',
    message:
      'Unable to establish tunnel connection. Run npx novu@latest dev in Local mode, or ensure your Tunnel app deployment is available.',
  },
  BRIDGE_ENDPOINT_NOT_FOUND: {
    code: 'BRIDGE_ENDPOINT_NOT_FOUND',
    message:
      'Could not connect to Bridge Endpoint. Make sure you are running your local app server.',
  },
  BRIDGE_ENDPOINT_UNAVAILABLE: {
    code: 'BRIDGE_ENDPOINT_UNAVAILABLE',
    message:
      'Unable to reach Bridge Endpoint. Run npx novu@latest dev in Local mode, or ensure your Bridge app deployment is available.',
  },
  BRIDGE_METHOD_NOT_CONFIGURED: {
    code: 'BRIDGE_METHOD_NOT_CONFIGURED',
    message:
      // eslint-disable-next-line max-len
      'Bridge Endpoint is not correctly configured. Ensure your `@novu/framework` integration exposes the `POST`, `GET`, and `OPTIONS` methods.',
  },
} satisfies Record<string, { code: string; message: string }>;
