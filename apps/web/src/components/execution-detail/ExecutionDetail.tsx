import { Container, Grid, useMantineTheme } from '@mantine/core';
import { format, parseISO } from 'date-fns';
import styled from '@emotion/styled';

import { ExecutionDetailShowRaw } from './ExecutionDetailShowRaw';
import { getColorByStatus, getLogoByType, getLogoByStatus } from './helpers';

import { colors, Text } from '@novu/design-system';
import { When } from '../utils/When';

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

const getExecutionDetailLogoByType = (type) => {
  const logo = getLogoByType(type);

  if (logo) {
    return logo;
  }

  return getLogoByStatus(type);
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
  const ExecutionDetailStatus = getExecutionDetailLogoByType(status);

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
        <When truthy={raw}>
          <ExecutionDetailShowRaw
            showTriggerSnippet={showTriggerSnippet}
            onShowExecutionDetail={onShowExecutionDetail}
            onHideExecutionDetail={onHideExecutionDetail}
          />
        </When>
      </Grid.Col>
    </Grid>
  );
};
