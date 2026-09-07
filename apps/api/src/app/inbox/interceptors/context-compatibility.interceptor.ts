import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Parses @novu/js version from Novu-Client-Version header.
 * Example: "@novu/js@3.13.0" -> "3.13.0"
 */
function parseClientVersion(clientVersion?: string): string | null {
  if (!clientVersion) return null;
  const match = clientVersion.match(/@novu\/js@(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

/**
 * Checks if client version supports context in identifiers.
 * Context support for preferences added in version 3.13.0
 */
function isContextAwareVersion(version: string): boolean {
  const MIN_VERSION = '3.13.0';
  const [major, minor, patch] = version.split('.').map(Number);
  const [minMajor, minMinor, minPatch] = MIN_VERSION.split('.').map(Number);

  if (major > minMajor) return true;
  if (major < minMajor) return false;
  if (minor > minMinor) return true;
  if (minor < minMinor) return false;
  return patch >= minPatch;
}

/**
 * Determines if context should be disabled for this request.
 * Only disables for old @novu/js client versions.
 */
function shouldDisableContextForOldClient(clientVersion?: string): boolean {
  const version = parseClientVersion(clientVersion);
  if (!version) {
    return true; // No client version header = old client (before 3.13.0), disable context
  }

  return !isContextAwareVersion(version);
}

/**
 * Interceptor that disables context features for old clients.
 *
 * Old @novu/js versions auto-generate identifiers without :ctx_,
 * but if contextKeys exist in JWT, server would create subscriptions
 * with :ctx_ causing identifier mismatches.
 *
 * This interceptor detects old clients via Novu-Client-Version header
 * and strips contextKeys from the session to maintain consistency.
 *
 * @see https://linear.app/novu/issue/NV-7072/context-preferences-subscription-identifier-compatibility-issue
 */
@Injectable()
export class ContextCompatibilityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const subscriberSession = request.user;

    // No session or no contextKeys = nothing to do
    if (!subscriberSession?.contextKeys || subscriberSession.contextKeys.length === 0) {
      return next.handle();
    }

    const clientVersion = request.headers['novu-client-version'];

    // Check if this is an old client
    if (shouldDisableContextForOldClient(clientVersion)) {
      // Disable context for old clients
      subscriberSession.contextKeys = undefined;
    }

    return next.handle();
  }
}
