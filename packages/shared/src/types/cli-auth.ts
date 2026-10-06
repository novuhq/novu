/** Default device-auth window for wizard and legacy CLI flows. */
export const CLI_DEVICE_SESSION_DEFAULT_TTL_SECONDS = 5 * 60;

/** Longer window for `novu connect` and `human login` — covers signing up before approving. */
export const CLI_DEVICE_SESSION_CONNECT_TTL_SECONDS = 30 * 60;

/** Hard cap on how long the CLI will poll for connect auth (sliding polls included). */
export const CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS = 60 * 60;

/** CLI surface identifier for `novu connect` device-auth sessions. */
export const CLI_DEVICE_SESSION_NAME_NOVU_CONNECT = 'novu-connect';

/** CLI surface identifier for `human login` device-auth sessions, approved on the Human dashboard. */
export const CLI_DEVICE_SESSION_NAME_HUMAN_CLI = 'human-cli';

/**
 * Letters of the short code a person types to approve a `human login` session. Consonants only, so codes
 * never spell words and can't be misread (no vowels, so no O/0 or I/1 either).
 */
export const CLI_USER_CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ';

/** A user code as the CLI prints it, e.g. `BCDF-GHJK`. */
export const CLI_USER_CODE_PATTERN = /^[BCDFGHJKLMNPQRSTVWXZ]{4}-[BCDFGHJKLMNPQRSTVWXZ]{4}$/;

export type CliDeviceSessionConfig = {
  ttlSeconds: number;
  slideTtlOnPoll: boolean;
  maxPollSeconds: number;
};

export function resolveCliDeviceSessionConfig(name?: string): CliDeviceSessionConfig {
  if (name === CLI_DEVICE_SESSION_NAME_NOVU_CONNECT || name === CLI_DEVICE_SESSION_NAME_HUMAN_CLI) {
    return {
      ttlSeconds: CLI_DEVICE_SESSION_CONNECT_TTL_SECONDS,
      slideTtlOnPoll: true,
      maxPollSeconds: CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS,
    };
  }

  return {
    ttlSeconds: CLI_DEVICE_SESSION_DEFAULT_TTL_SECONDS,
    slideTtlOnPoll: false,
    maxPollSeconds: 0,
  };
}

export type CliDeviceSessionUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type CreateCliDeviceSessionResponse = {
  deviceCode: string;
  expiresIn: number;
  interval: number;
  /** Page where the session is approved, when the API decides it (`human login`). Other CLIs open the dashboard. */
  verificationUrl?: string;
  /**
   * Short code the person types on that page (`human login`). Approving takes this code, so the device code the
   * CLI polls with never appears in a browser.
   */
  userCode?: string;
};

export type CliDeviceSessionPollResponse =
  | { status: 'pending'; expiresIn: number; interval: number }
  | { status: 'expired' }
  | {
      status: 'approved';
      apiKey: string;
      environmentId: string;
      environmentSlug?: string | null;
      environmentName?: string | null;
      organizationId?: string | null;
      user?: CliDeviceSessionUser | null;
    };

export type ApproveCliDeviceSessionRequest = {
  apiKey: string;
  environmentId: string;
};
