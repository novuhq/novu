import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

const LOG_ANALYTICS_KEY = 'logAnalytics';

/**
 * Analytics Logs Guard
 *
 * This guard sets the `_shouldLogAnalytics` flag on incoming requests early in the NestJS lifecycle.
 * It runs BEFORE interceptors, ensuring the flag is available even if interceptors throw exceptions.
 *
 * Why use a Guard instead of an Interceptor?
 * - Guards execute before interceptors in the NestJS request lifecycle
 * - If any interceptor throws an exception, subsequent interceptors never run, so the flag
 *   cannot be reliably set by an interceptor that might not execute
 * - By setting the flag in a guard, AllExceptionsFilter can always check for analytics logging
 *   regardless of which interceptor threw the exception
 * - AllExceptionsFilter cannot access decorator metadata directly since it operates outside
 *   the normal request lifecycle and doesn't have access to the original ExecutionContext
 *
 * Example execution order:
 * 1. Guard runs → sets _shouldLogAnalytics = true
 * 2. QuotaThrottlerInterceptor runs → throws exception
 * 3. AllExceptionsFilter runs → finds _shouldLogAnalytics = true → logs analytics
 */
@Injectable()
export class AnalyticsLogsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const shouldLogAnalytics = this.shouldLogAnalytics(context);

    if (shouldLogAnalytics) {
      const request = context.switchToHttp().getRequest();
      request._shouldLogAnalytics = true;
    }

    // Always return true - this guard never blocks requests, it only sets metadata
    return true;
  }

  private shouldLogAnalytics(context: ExecutionContext): boolean {
    // Check if @LogAnalytics() decorator is present on the handler or controller
    const handlerMetadata = this.reflector.get(LOG_ANALYTICS_KEY, context.getHandler());
    const classMetadata = this.reflector.get(LOG_ANALYTICS_KEY, context.getClass());

    return handlerMetadata !== undefined || classMetadata !== undefined;
  }
}
