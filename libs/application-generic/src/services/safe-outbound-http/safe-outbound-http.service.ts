import { Injectable } from '@nestjs/common';
import {
  type SafeOutboundJsonResponse,
  type SafeOutboundRequestOptions,
  type SafeOutboundResponse,
  safeOutboundJsonRequest,
  safeOutboundRequest,
} from '@novu/shared/utils/safe-outbound-http';
import { PinoLogger } from '../../logging';

/**
 * NestJS-friendly wrapper around the SSRF-safe outbound HTTP primitives.
 *
 * Use this service for **every** outbound HTTP call that fans out to
 * user-supplied destinations: webhooks, bridge endpoints, reply callbacks,
 * provider URLs, etc.
 *
 * The underlying helpers enforce:
 *  - URL must be http/https with no embedded credentials and no blocked hostname.
 *  - DNS is resolved per attempt; private/reserved IPs are rejected before the
 *    TCP connection is opened.
 *  - The TCP connection is pinned to a validated IP; the original hostname is
 *    preserved as the `Host` header and as the SNI servername.
 *  - Redirects are followed manually; each `Location` target re-runs the same
 *    SSRF policy (URL + DNS), defending against late-binding attacks.
 *  - Sensitive headers (Authorization, Cookie, signature/HMAC) are stripped
 *    when a redirect crosses an origin boundary.
 *
 * Errors surface as {@link import('@novu/shared/utils/ssrf-url-validation').SsrfBlockedError}
 * for policy rejections, or generic Errors for transport/timeout/parse failures.
 */
@Injectable()
export class SafeOutboundHttpService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Issue an SSRF-safe HTTP request and receive the raw response.
   */
  request(options: SafeOutboundRequestOptions): Promise<SafeOutboundResponse> {
    return safeOutboundRequest(options);
  }

  /**
   * Issue an SSRF-safe HTTP request with JSON encoding and JSON response parsing.
   */
  json<T = unknown>(options: SafeOutboundRequestOptions): Promise<SafeOutboundJsonResponse<T>> {
    return safeOutboundJsonRequest<T>(options);
  }
}
