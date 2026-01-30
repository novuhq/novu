import { ITranslationJobData } from '@novu/shared';

import { IBulkJobParams, IJobParams } from '../services/queues/queue-base.service';

/**
 * DTO for translation job data
 *
 * This extends the shared ITranslationJobData interface for use
 * in the application-generic layer.
 */
export interface ITranslationDataDto extends ITranslationJobData {
  /**
   * Skip processing flag (used for shadow mode or cancelled jobs)
   */
  skipProcessing?: boolean;
}

/**
 * DTO for a single translation job
 */
export interface ITranslationJobDto extends IJobParams {
  data: ITranslationDataDto;
}

/**
 * DTO for bulk translation jobs
 */
export interface ITranslationBulkJobDto extends IBulkJobParams {
  data: ITranslationDataDto;
}
