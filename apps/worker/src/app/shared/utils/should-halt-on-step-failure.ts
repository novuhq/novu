import { isActionStepType } from '@novu/application-generic';
import { JobEntity } from '@novu/dal';

export const shouldHaltOnStepFailure = (job: JobEntity): boolean => {
  /*
   * Action steps always stop on failure across all versions (v1 & v2)
   */
  if (job.type && isActionStepType(job.type)) {
    return true;
  }

  /*
   * Legacy v1 behavior:
   * Return true if shouldStopOnFail was explicitly enabled by user
   */
  return job.step.shouldStopOnFail === true;
};
