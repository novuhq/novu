import { RequestWithReqId } from '../middleware/request-id.middleware';

/**
 * Extracts the request ID from the request object without fallback.
 * Returns undefined if no request ID is attached to the request.
 */
export function getRequestId(req: RequestWithReqId): string | undefined {
  return req._nvRequestId;
}
