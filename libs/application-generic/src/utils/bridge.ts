import { DigestOutput, DigestRegularOutput, DigestTimedOutput } from '@novu/framework/internal';
import { DigestTypeEnum } from '@novu/shared';

export function getDigestType(outputs: DigestOutput): DigestTypeEnum {
  if (isTimedDigestOutput(outputs)) {
    return DigestTypeEnum.TIMED;
  } else if (isLookBackDigestOutput(outputs)) {
    return DigestTypeEnum.BACKOFF;
  }

  return DigestTypeEnum.REGULAR;
}

export const isTimedDigestOutput = (outputs: DigestOutput | undefined): outputs is DigestTimedOutput => {
  return (outputs as DigestTimedOutput)?.cron != null;
};

export const isLookBackDigestOutput = (outputs: DigestOutput): outputs is DigestRegularOutput => {
  return (
    (outputs as DigestRegularOutput)?.lookBackWindow?.amount != null &&
    (outputs as DigestRegularOutput)?.lookBackWindow?.unit != null
  );
};

export const isRegularDigestOutput = (outputs: DigestOutput): outputs is DigestRegularOutput => {
  return !isTimedDigestOutput(outputs) && !isLookBackDigestOutput(outputs);
};

export const BRIDGE_EXECUTION_ERROR = {
  INVALID_BRIDGE_URL: {
    code: 'InvalidBridgeUrl',
    message: (bridgeUrl: string) => `Invalid bridge URL: ${bridgeUrl}`,
  },
  TUNNEL_NOT_FOUND: {
    code: 'TunnelNotFound',
    message: (url: string) =>
      `Unable to establish tunnel connection to \`${url}\`. Run npx novu@latest dev in Local mode, or ensure your Tunnel app deployment is available.`,
  },
  BRIDGE_ENDPOINT_NOT_FOUND: {
    code: 'BridgeEndpointNotFound',
    message: (url: string) =>
      `Could not connect to Bridge Endpoint at \`${url}\`. Make sure you are running your local app server.`,
  },
  BRIDGE_ENDPOINT_UNAVAILABLE: {
    code: 'BridgeEndpointUnavailable',
    message: (url: string) =>
      `Unable to reach Bridge Endpoint at \`${url}\`. Run npx novu@latest dev in Local mode, or ensure your Bridge app deployment is available.`,
  },
  BRIDGE_METHOD_NOT_CONFIGURED: {
    code: 'BridgeMethodNotConfigured',
    message: (url: string) =>
      `Bridge Endpoint at \`${url}\` is not correctly configured. Ensure your \`@novu/framework\` integration exposes the \`POST\`, \`GET\`, and \`OPTIONS\` methods.`,
  },
  BRIDGE_REQUEST_TIMEOUT: {
    code: 'BridgeRequestTimeout',
    message: (url: string) => `Bridge request timeout for \`${url}\``,
  },
  UNSUPPORTED_PROTOCOL: {
    code: 'UnsupportedProtocol',
    message: (url: string) => `Unsupported protocol for \`${url}\``,
  },
  RESPONSE_READ_ERROR: {
    code: 'ResponseReadError',
    message: (url: string) => `Response body could not be read for \`${url}\``,
  },
  REQUEST_UPLOAD_ERROR: {
    code: 'RequestUploadError',
    message: (url: string) => `Error uploading request body for \`${url}\``,
  },
  REQUEST_CACHE_ERROR: {
    code: 'RequestCacheError',
    message: (url: string) => `Error caching request for \`${url}\``,
  },
  MAXIMUM_REDIRECTS_EXCEEDED: {
    code: 'MaximumRedirectsExceeded',
    message: (url: string) => `Maximum redirects exceeded for \`${url}\``,
  },
  SELF_SIGNED_CERTIFICATE: {
    code: 'SelfSignedCertificate',
    message: (url: string) => `Bridge Endpoint can't use a self signed certificate in production environments.`,
  },
  PAYLOAD_TOO_LARGE: {
    code: 'PayloadTooLarge',
    message: (url: string) => `Payload too large for \`${url}\``,
  },
  UNKNOWN_BRIDGE_REQUEST_ERROR: {
    code: 'UnknownBridgeRequestError',
    message: (url: string) => `Unknown bridge request error calling \`${url}\``,
  },
  UNKNOWN_BRIDGE_NON_REQUEST_ERROR: {
    code: 'UnknownBridgeNonRequestError',
    message: (url: string) => `Unknown bridge non-request error calling \`${url}\``,
  },
} satisfies Record<string, { code: string; message: (url: string) => string }>;
