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
