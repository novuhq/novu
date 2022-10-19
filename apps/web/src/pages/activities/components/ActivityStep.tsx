import { Grid, Text } from '@mantine/core';
import * as capitalize from 'lodash.capitalize';
import { ProviderImage } from './ProviderImage';
import { useJobStatus } from '../hooks/useJobStatus';
import { colors, shadows } from '../../../design-system';
import styled from 'styled-components';

export const ActivityStep = ({ job }) => {
  const status = useJobStatus(job);

  return (
    <Grid.Col span={3}>
      <StepItem>
        <Grid>
          <Grid.Col span={3}>
            <Header done={status === 'Success'} failed={status === 'Failed'}>
              {capitalize(job.type)}
            </Header>
          </Grid.Col>
          <Grid.Col
            span={9}
            sx={{
              textAlign: 'right',
            }}
          >
            <ProviderImage providerId={job.providerId} />
          </Grid.Col>
        </Grid>
        <Text
          sx={{
            color: colors.B80,
            fontSize: '12px',
          }}
        >
          {job.executionDetails?.at(-1)?.detail}
        </Text>
      </StepItem>
    </Grid.Col>
  );
};

const StepItem = styled.div`
  background: ${colors.B20};
  padding: 15px;
  box-shadow: ${shadows.dark};
  border-radius: 7px;
  height: 100%;
  width: 100%;
`;

const Header = styled.h4<{ done: boolean; failed }>`
  color: ${({ done, failed }) => {
    if (failed) {
      return colors.error;
    }

    if (done) {
      return colors.success;
    }

    return colors.white;
  }};
  margin-top: 0px;
`;
