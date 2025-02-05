import { StepTypeEnum } from '@novu/shared';

export const shouldHaltOnStepFailure = (
  stepType: StepTypeEnum | undefined,
  shouldStopOnFail: boolean | undefined
): boolean | undefined => {
  if (!stepType) {
    return shouldStopOnFail;
  }

  /*
   * Action steps always stop on failure across all versions (v1 & v2)
   */
  if (stepType === StepTypeEnum.DELAY) {
    return true;
  }

  /*
   * Legacy v1 behavior:
   * Return true if shouldStopOnFail was explicitly enabled by user
   */
  if (shouldStopOnFail === true) {
    return true;
  }

  return false;
};
