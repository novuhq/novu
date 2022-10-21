import { Grid, Text } from '@mantine/core';
import * as capitalize from 'lodash.capitalize';
import { ProviderImage } from './ProviderImage';
import { useJobStatus } from '../hooks/useJobStatus';
import { colors, shadows } from '../../../design-system';
import styled from 'styled-components';
import { CheckCircle, ErrorIcon, Timer } from '../../../design-system/icons';
import { When } from '../../../components/utils/When';
import { ExecutionDetailsStatusEnum } from '@novu/shared';
import { ClockCircleOutlined } from '@ant-design/icons';

export const ActivityStep = ({ job, span = 4 }) => {
  const status = useJobStatus(job);

  return (
    <Grid.Col
      span={span}
      sx={{
        padding: 0,
      }}
    >
      <StepItem>
        <Grid>
          <Grid.Col span={1}>
            <When
              truthy={status !== ExecutionDetailsStatusEnum.SUCCESS && status !== ExecutionDetailsStatusEnum.FAILED}
            >
              <Timer width={16} height={16} />
            </When>
            <When truthy={status === ExecutionDetailsStatusEnum.SUCCESS}>
              <CheckCircle width="16" height="16" color={colors.success} />
            </When>
            <When truthy={status === ExecutionDetailsStatusEnum.FAILED}>
              <ErrorIcon width="16" height="16" color={colors.error} />
            </When>
          </Grid.Col>
          <Grid.Col span={2}>
            <Header
              done={status === ExecutionDetailsStatusEnum.SUCCESS}
              failed={status === ExecutionDetailsStatusEnum.FAILED}
            >
              {capitalize(job.type)}
            </Header>
          </Grid.Col>
          <Grid.Col
            span={8}
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
