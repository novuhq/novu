import { createHash } from 'crypto';

/*
 * Creates a bridge endpoint url to be used for request from novu cloud to the local
 * workflow definition
 */
export const buildBridgeEndpointUrl = (
  apiKey: string,
  baseAddress: string
): string => {
  return `${buildBridgeSubdomain(apiKey)}.${baseAddress}`;
};

/*
 * Creates a bridge subdomain based on the apiKey provided
 */
export const buildBridgeSubdomain = (apiKey: string): string => {
  return createHash('md5').update(apiKey).digest('hex');
};
