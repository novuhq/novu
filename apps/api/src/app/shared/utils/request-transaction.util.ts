import { generateTransactionId } from '../helpers';
import { RequestWithTransactionId } from '../middleware/transaction-id.middleware';

/**
 * Extracts the transaction ID from the request object.
 * If no transaction ID is found, generates a new one as fallback.
 */
export function getRequestTransactionId(req: RequestWithTransactionId): string {
  return req._transactionId || generateTransactionId();
}

/**
 * Extracts the transaction ID from the request object without fallback.
 * Returns undefined if no transaction ID is attached to the request.
 */
export function getRequestTransactionIdSafe(req: RequestWithTransactionId): string | undefined {
  return req._transactionId;
}
