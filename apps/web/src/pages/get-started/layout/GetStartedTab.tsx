import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Grid, Timeline } from '@mantine/core';

import { ProductUseCasesEnum } from '@novu/shared';

import { onboardingUseCases } from '../consts';
import { OnboardingParams } from '../types';
import { ROUTES } from '../../../constants/routes.enum';
import { OnboardingUseCasesTabsEnum } from '../../../constants/onboarding-tabs';

interface IGetStartedTabProps {
  usecase?: ProductUseCasesEnum;
}

export function GetStartedTab(props: IGetStartedTabProps) {
  const navigate = useNavigate();
  const { usecase: usecaseParam } = useParams<Record<OnboardingParams, OnboardingUseCasesTabsEnum | undefined>>();

  const usecase = (props.usecase || usecaseParam?.replace('-', '_')) as ProductUseCasesEnum | undefined;

  /*
   * This will redirect to the in-app tab if the use case is not provided in the parameters and component input.
   * * This state should not occur; it was added as a precautionary measure.
   */
  useEffect(() => {
    if (!usecase) {
      navigate(`${ROUTES.GET_STARTED}/${OnboardingUseCasesTabsEnum.IN_APP}`);
    }
  }, [navigate, usecase]);

  if (!usecase) {
    return null;
  }

  const { steps, demo } = onboardingUseCases[usecase];

  return (
    <Grid align="stretch">
      <Grid.Col span={4}>
        <Timeline bulletSize={40} lineWidth={2}>
          {steps.map((step, index) => (
            <Timeline.Item bullet={index + 1} lineVariant={'dashed'} key={step}>
              {step}
            </Timeline.Item>
          ))}
        </Timeline>
      </Grid.Col>

      <Grid.Col span={8}>{demo} </Grid.Col>
    </Grid>
  );
}
