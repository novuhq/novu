import { Container, Grid, useMantineColorScheme } from '@mantine/core';
import { ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { format, parseISO } from 'date-fns';
import styled from 'styled-components';

import { ExecutionDetailShowRaw } from './ExecutionDetailShowRaw';

import { Button, colors, Text } from '../../design-system';
import { CheckCircle, Digest, ErrorIcon, Mail, Timer } from '../../design-system/icons';

const DetailText = styled(Text)<{ theme: string }>`
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B40)};
  font-size: 14px;
  font-weight: 400;
  line-height: 17px;
`;

const ExecutionDetailStatusWrapper = styled(Container)`
  padding: 2px;
  width: 15px;
`;

const FormattedTime = styled(Text)`
  color: colors.B60;
  font-size: 12px;
  font-height: 16px;
  padding: 3px 0;
`;

const getColorByStatus = (theme, status) => {
  if (status === ExecutionDetailsStatusEnum.FAILED) {
    return colors.error;
  }

  if (status === ExecutionDetailsStatusEnum.SUCCESS) {
    return colors.success;
  }

  return theme.colorScheme === 'dark' ? colors.B60 : colors.B40;
};

const getLogoByStatus = (status) => {
  if (status === ExecutionDetailsStatusEnum.SUCCESS) {
    return CheckCircle;
  }

  if (status === ExecutionDetailsStatusEnum.FAILED) {
    return ErrorIcon;
  }

  return Timer;
};

const getLogoByType = (type) => {
  if (type == StepTypeEnum.DELAY) {
    return Timer;
  }

  if (type == StepTypeEnum.DIGEST) {
    return Digest;
  }

  return null;
};

const getExecutionDetailStatus = (status, type) => {
  const logo = getLogoByType(type);

  if (logo) {
    return logo;
  }

  return getLogoByStatus(status);
};

const ExecutionDetailTime = ({ createdAt }) => {
  const formattedTime = format(parseISO(createdAt), 'HH:mm:ss');

  return <FormattedTime>{formattedTime}</FormattedTime>;
};

export const ExecutionDetail = ({ executionDetail, onShowExecutionDetail, onHideExecutionDetail }) => {
  const theme = useMantineColorScheme();
  const { createdAt, detail, raw, status, type } = executionDetail;
  const color = getColorByStatus(theme, status);
  const ExecutionDetailStatus = getExecutionDetailStatus(status, type);

  const secondColumnSpan = raw ? 8 : 11;

  return (
    <Grid gutter={10}>
      <Grid.Col span={1}>
        <ExecutionDetailStatusWrapper>
          <ExecutionDetailStatus color={color} width="15px" height="15px" />
        </ExecutionDetailStatusWrapper>
      </Grid.Col>
      <Grid.Col span={secondColumnSpan}>
        <DetailText theme={theme}>{detail}</DetailText>
        <ExecutionDetailTime createdAt={createdAt} />
      </Grid.Col>
      <Grid.Col span={3}>
        {raw && (
          <ExecutionDetailShowRaw
            raw={raw}
            onShowExecutionDetail={onShowExecutionDetail}
            onHideExecutionDetail={onHideExecutionDetail}
          />
        )}
      </Grid.Col>
    </Grid>
  );
};
