import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Grid } from '@mantine/core';

import { ProductUseCasesEnum } from '@novu/shared';
import { colors, Text } from '@novu/design-system';

import { onboardingUseCases } from '../consts';
import { OnboardingParams } from '../types';
import { ROUTES } from '../../../constants/routes.enum';
import { OnboardingUseCasesTabsEnum } from '../../../constants/onboarding-tabs';
import Card from '../../../components/layout/components/Card';
import { Timeline } from '../components/timeline/Timeline';

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

  const { steps, Demo, title, description } = onboardingUseCases[usecase];

  return (
    <Grid align="stretch">
      <Grid.Col span={4} mt={11.5}>
        <Card title={title} space={8} mb={24}>
          <Text style={{ color: colors.B60 }}>{description}</Text>
        </Card>
        <Timeline steps={steps} />
      </Grid.Col>

      <Grid.Col span={8}>
        <Demo />
      </Grid.Col>
    </Grid>
  );
}
