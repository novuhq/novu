export const DEFAULT_NOVU_API_BASE_URL = 'https://api.novu.co';

export enum NovuApiEndpointsEnum {
  SYNC = '/v1/bridge/sync',
  DIFF = '/v1/bridge/diff',
}

export const SIGNATURE_TIMESTAMP_TOLERANCE_MINUTES = 5;
export const SIGNATURE_TIMESTAMP_TOLERANCE = SIGNATURE_TIMESTAMP_TOLERANCE_MINUTES * 60 * 5; // 5 minutes
