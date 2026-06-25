/** Default device-auth window for wizard and legacy CLI flows. */
export const CLI_DEVICE_SESSION_DEFAULT_TTL_SECONDS = 5 * 60;

/** Longer window for `novu connect` — covers sign-up + org creation in the dashboard. */
export const CLI_DEVICE_SESSION_CONNECT_TTL_SECONDS = 30 * 60;

/** Hard cap on how long the CLI will poll for connect auth (sliding polls included). */
export const CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS = 60 * 60;

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
