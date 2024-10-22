import { createHash } from 'crypto';

/*
 * Creates a bridge endpoint url to be used for request from novu cloud to the local
 * workflow definition
 */
export const buildBridgeEndpointUrl = (
  apiKey: string,
  baseAddress: string,
): string => {
  return `${buildBridgeSubdomain(apiKey)}.${baseAddress}`;
};

/*
 * Creates a bridge subdomain based on the apiKey provided. This function is used in several
 * places, including packages/novu/src/commands/init/templates/index.ts when generating the
 * subdomain in the bridge application. Developers should take care to keep changes
 * in sync.
 */
export const buildBridgeSubdomain = (apiKey: string): string => {
  return createHash('md5').update(apiKey).digest('hex');
};
