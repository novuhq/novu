/**
 * Enum to define the origin of the resource.
 *
 * The `ResourceOriginEnum` is used to evaluate the source for the bridge,
 * which helps determine which endpoint to call during the Preview & Execution phase.
 * * - 'novu-cloud' indicates that the resource originates from Novu's platform, so the Novu-hosted endpoint is used.
 * * - 'external' indicates that the resource originates from an external source, requiring a call to a customer-hosted Bridge endpoint.
 */
export enum ResourceOriginEnum {
  NOVU_CLOUD = 'novu-cloud',
  NOVU_CLOUD_V1 = 'novu-cloud-v1',
  EXTERNAL = 'external',
}

/**
 * Enum to define the type of the resource.
 *
 * One of its responsibilities is to help the API determine whether "changes" need to be created during the upsert process.
 */
export enum ResourceTypeEnum {
  REGULAR = 'REGULAR',
  /** @deprecated Use BRIDGE instead */
  ECHO = 'ECHO',
  BRIDGE = 'BRIDGE',
}
