import { isActionStepType } from '@novu/application-generic';
import { JobEntity } from '@novu/dal';

export const shouldHaltOnStepFailure = (job: JobEntity): boolean => {
  if (!job.type) {
    return typeof job.step.shouldStopOnFail === 'boolean' ? job.step.shouldStopOnFail : false;
  }

  /*
   * Action steps always stop on failure across all versions (v1 & v2)
   */
  if (isActionStepType(job.type)) {
    return true;
  }

  /*
   * Legacy v1 behavior:
   * Return true if shouldStopOnFail was explicitly enabled by user
   */
  if (job.step.shouldStopOnFail === true) {
    return true;
  }

  return false;
};
