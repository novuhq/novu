import styled from '@emotion/styled';
import { Grid } from '@mantine/core';

import { colors, Text } from '@novu/design-system';

import Card from '../../../components/layout/components/Card';
import { Timeline } from '../components/timeline/Timeline';
import { OnboardingUseCase } from '../consts/types';

type IGetStartedTabProps = OnboardingUseCase;

const StyledTimeline = styled(Timeline)<{ hasBottomSection?: boolean }>(
  ({ hasBottomSection }) => `
  margin-bottom: ${hasBottomSection ? '1.5rem' : 0};
`
);

export function GetStartedTab({ steps, Demo, title, description, BottomSection }: IGetStartedTabProps) {
  return (
    <Grid align="stretch" justify={'space-between'}>
      <Grid.Col span={3} mt={12}>
        <Card title={title} space={description ? '0.5rem' : 0} mb={description ? 24 : 16}>
          {description ? <Description>{description}</Description> : null}
        </Card>
        <StyledTimeline steps={steps} hasBottomSection={!!BottomSection} />
        {BottomSection ? <BottomSection /> : null}
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
