import { IEnvironment, StepTypeEnum } from '@novu/shared';
import { delV2 } from './api.client';

export const disconnectStepResolver = async ({
  environment,
  stepInternalId,
  stepType,
}: {
  environment: IEnvironment;
  stepInternalId: string;
  stepType: StepTypeEnum;
}): Promise<void> => {
  await delV2<void>(`/step-resolvers/${stepInternalId}/disconnect`, {
    environment,
    body: { stepType },
  });
};
