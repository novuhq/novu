import { IncomingHttpHeaders } from 'node:http';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { RequestWithTransactionId } from '../../middleware/transaction-id.middleware';
import { getRequestTransactionId, getRequestTransactionIdSafe } from '../../utils/request-transaction.util';

@Injectable({ scope: Scope.REQUEST })
export class GetRequestContext {
  constructor(@Inject(REQUEST) private readonly request: RequestWithTransactionId) {}

  async execute() {
    return {
      request: this.request,
      transactionId: this.getTransactionId(),
      transactionIdSafe: this.getTransactionIdSafe(),
    };
  }

  /**
   * Get the current request object
   */
  getRequest(): RequestWithTransactionId {
    return this.request;
  }

  /**
   * Get the transaction ID with fallback generation
   */
  getTransactionId(): string {
    return getRequestTransactionId(this.request);
  }

  /**
   * Get the transaction ID without fallback, returns undefined if not present
   */
  getTransactionIdSafe(): string | undefined {
    return getRequestTransactionIdSafe(this.request);
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
