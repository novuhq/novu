import { IncomingHttpHeaders } from 'node:http';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { RequestWithReqId } from '../../middleware/request-id.middleware';
import { getRequestId } from '../../utils/request-transaction.util';

@Injectable({ scope: Scope.REQUEST })
export class GetRequestContext {
  constructor(@Inject(REQUEST) private readonly request: RequestWithReqId) {}

  async execute() {
    return {
      request: this.request,
      requestId: this.getRequestId(),
    };
  }

  /**
   * Get the current request object
   */
  getRequest(): RequestWithReqId {
    return this.request;
  }

  /**
   * Get the transaction ID without fallback, returns undefined if not present
   */
  getRequestId(): string {
    // biome-ignore lint/style/noNonNullAssertion: Request ID is guaranteed by middleware
    return getRequestId(this.request)!;
  }

  /**
   * Get request headers
   */
  getHeaders(): IncomingHttpHeaders {
    return this.request.headers;
  }

  /**
   * Get request method
   */
  getMethod(): string {
    return this.request.method;
  }

  /**
   * Get request URL
   */
  getUrl(): string {
    return this.request.url;
  }

  /**
   * Get user agent
   */
  getUserAgent(): string | undefined {
    return this.request.headers['user-agent'];
  }
}
