import { Container, Grid, useMantineTheme } from '@mantine/core';
import { ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { format, parseISO } from 'date-fns';
import styled from 'styled-components';

import { ExecutionDetailShowRaw } from './ExecutionDetailShowRaw';
import { getColorByStatus, getLogoByType, getLogoByStatus } from './helpers';

import { Button, colors, Text } from '../../design-system';
import { CheckCircle, Digest, ErrorIcon, Mail, Timer } from '../../design-system/icons';

const ExecutionDetailStatusWrapper = styled(Container)`
  padding: 2px;
  width: 15px;
`;

const FormattedTime = styled(Text)`
  color: ${colors.B60};
  font-size: 12px;
  font-height: 16px;
  padding: 3px 0;
`;

const ExecutionDetailTime = ({ createdAt }) => {
  const formattedTime = format(parseISO(createdAt), 'HH:mm:ss');

  return <FormattedTime>{formattedTime}</FormattedTime>;
};

const getExecutionDetailStatus = (status, type) => {
  const logo = getLogoByType(type);

  if (logo) {
    return logo;
  }

  return getLogoByStatus(status);
};

export const ExecutionDetail = ({
  executionDetail,
  onShowExecutionDetail,
  onHideExecutionDetail,
  showTriggerSnippet,
}) => {
  const theme = useMantineTheme();
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
        <Text>{detail}</Text>
        <ExecutionDetailTime createdAt={createdAt} />
      </Grid.Col>
      <Grid.Col span={3}>
        {raw && (
          <ExecutionDetailShowRaw
            raw={raw}
            showTriggerSnippet={showTriggerSnippet}
            onShowExecutionDetail={onShowExecutionDetail}
            onHideExecutionDetail={onHideExecutionDetail}
          />
        )}
      </Grid.Col>
    </Grid>
  );
};
