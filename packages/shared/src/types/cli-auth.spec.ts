import { describe, expect, it } from 'vitest';
import {
  CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS,
  CLI_DEVICE_SESSION_CONNECT_TTL_SECONDS,
  CLI_DEVICE_SESSION_DEFAULT_TTL_SECONDS,
  CLI_DEVICE_SESSION_NAME_HUMAN,
  resolveCliDeviceSessionConfig,
} from './cli-auth';

describe('resolveCliDeviceSessionConfig', () => {
  it('gives Human enough time to finish dashboard sign-in', () => {
    expect(resolveCliDeviceSessionConfig(CLI_DEVICE_SESSION_NAME_HUMAN)).toEqual({
      ttlSeconds: CLI_DEVICE_SESSION_CONNECT_TTL_SECONDS,
      slideTtlOnPoll: true,
      maxPollSeconds: CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS,
    });
  });

  it('keeps the default behavior for other CLI callers', () => {
    expect(resolveCliDeviceSessionConfig('novu-wizard')).toEqual({
      ttlSeconds: CLI_DEVICE_SESSION_DEFAULT_TTL_SECONDS,
      slideTtlOnPoll: false,
      maxPollSeconds: 0,
    });
  });
});
