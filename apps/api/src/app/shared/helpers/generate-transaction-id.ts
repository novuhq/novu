import { generateObjectId } from '@novu/application-generic';

export function generateTransactionId() {
  return `txn_${generateObjectId()}`;
}
