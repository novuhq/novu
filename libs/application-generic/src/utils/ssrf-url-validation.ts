// Re-export the shared SSRF primitives so backend code keeps a single import path.
// New code should prefer `safeOutboundRequest` / `safeOutboundJsonRequest` from
// `@novu/shared/utils/safe-outbound-http`, which enforce the policy at connect time
// and re-validate every redirect.
export {
  assertSafeOutboundUrl,
  isPrivateIp,
  normalizeOutboundHttpUrl,
  resolvePublicAddresses,
  SsrfBlockedError,
  type SsrfBlockReason,
  // biome-ignore lint/style/noRestrictedImports: re-export of the deprecated validateUrlSsrf for backward compatibility — see NV-7560
  validateUrlSsrf,
} from '@novu/shared/utils/ssrf-url-validation';
export {
  safeOutboundJsonRequest,
  safeOutboundRequest,
  type SafeOutboundJsonResponse,
  type SafeOutboundMethod,
  type SafeOutboundRequestOptions,
  type SafeOutboundResponse,
} from '@novu/shared/utils/safe-outbound-http';
