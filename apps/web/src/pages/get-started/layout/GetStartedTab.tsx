import styled from '@emotion/styled';
import { Grid } from '@mantine/core';

import { ArrowLeft, Button, colors, Text } from '@novu/design-system';
import { useMemo } from 'react';

import Card from '../../../components/layout/components/Card';
import { Timeline } from '../components/timeline/Timeline';
import { AdditionInformationLink } from '../components/AdditionInformationLink';
import { IOnboardingUseCaseViewContext, OnboardingUseCase } from '../consts/types';

export interface IGetStartedTabProps extends OnboardingUseCase, IOnboardingUseCaseViewContext {}

const StyledTimeline = styled(Timeline)<{ hasBottomSection?: boolean }>(
  ({ hasBottomSection }) => `
  margin-bottom: ${hasBottomSection ? '1.5rem' : 0};
`
);

const TabBreadcrumb = styled(Button)(
  ({ theme }) => `
  padding: 0;
  background: none;
  border: none;
  color: ${theme.colors.gray[7]};
  margin-bottom: 1rem;
  height: inherit;
  
  display: flex;
  
  & span {
    background-image: none;
    font-weight: normal;
  }
  `
);

export function GetStartedTab({ setView, currentView, views, ...tabProps }: IGetStartedTabProps) {
  const shouldShowBreadcrumb = !!currentView && views && !!views[currentView];

  const { steps, Demo, title, description, BottomSection, type, useCaseLink } = useMemo(() => {
    if (!currentView || !views) {
      return tabProps;
    }

    return views[currentView] ?? tabProps;
  }, [views, currentView, tabProps]);

  return (
    <Grid align="stretch" justify={'space-between'}>
      <Grid.Col span={3} mt={12}>
        {shouldShowBreadcrumb ? (
          <TabBreadcrumb onClick={() => setView(null)}>
            <ArrowLeft />
            Back to description
          </TabBreadcrumb>
        ) : null}
        <Card title={title} space={description ? '0.5rem' : 0} mb={description ? 24 : 16}>
          {description ? <Description>{description}</Description> : null}
        </Card>
        <StyledTimeline steps={steps} hasBottomSection={!!BottomSection} />
        {BottomSection ? <BottomSection setView={setView} /> : null}
        <AdditionInformationLink channel={type} href={useCaseLink} />
      </Grid.Col>
      <Grid.Col span={8}>
        <Demo />
      </Grid.Col>
    </Grid>
  );
}

const Description = styled(Text)`
  color: ${colors.B60};
  line-height: 1.5rem;
`;
