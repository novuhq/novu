import { IEnvironment, StepTypeEnum } from '@novu/shared';
import { delV2, getV2 } from './api.client';

export const getStepResolversCount = async ({
  environment,
}: {
  environment: IEnvironment;
}): Promise<{ count: number }> => {
  const { data } = await getV2<{ data: { count: number } }>('/step-resolvers/count', { environment });

  return data;
};

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
