import { BulkCreateExecutionDetails, CreateExecutionDetails } from '@novu/application-generic';

import { GetExecutionDetails } from './get-execution-details';
import { GetExecutionDetailsByTransactionId } from './get-execution-details-transactionId';

export const USE_CASES = [
  CreateExecutionDetails,
  BulkCreateExecutionDetails,
  GetExecutionDetails,
  GetExecutionDetailsByTransactionId,
];
