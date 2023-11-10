import { useState } from 'react';
import { Container, Grid } from '@mantine/core';
import styled from '@emotion/styled';

import { ExecutionDetail } from './ExecutionDetail';
import { ExecutionDetailRawSnippet } from './ExecutionDetailShowRaw';
import { ExecutionDetailTrigger } from './ExecutionDetailTrigger';
import { colors, Text } from '@novu/design-system';
import { When } from '../utils/When';

const ExecutionDetailsStepContentWrapper = styled.div`
  margin: 0;
  padding: 0;
`;

const TimelineTitle = styled(Text)`
  font-size: 14px;
  font-weight: 700;
  line-height: 17px;
  padding-bottom: 20px;
`;

const GridColContainer = styled(Container)`
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B20 : colors.B98)};
  border-radius: 7px;
  padding: 20px;
`;

export const ExecutionDetailsStepContent = ({ identifier, step, subscriberVariables }) => {
  const [detailId, setDetailId] = useState<string>('');
  const [executionDetailsRawSnippet, setExecutionDetailsRawSnippet] = useState<string>('');
  const { executionDetails } = step || {};

  const onShowExecutionDetail = (id, raw) => () => {
    setDetailId(id);
    setExecutionDetailsRawSnippet(raw);
  };

  const onHideExecutionDetail = () => {
    setExecutionDetailsRawSnippet('');
    setDetailId('');
  };

  return (
    <ExecutionDetailsStepContentWrapper key={`execution-detals-step-content-wrapper-${step.id}`}>
      <Grid gutter={20}>
        <Grid.Col span={6}>
          <GridColContainer>
            <TimelineTitle>Step Timeline</TimelineTitle>
            {executionDetails.map((executionDetail) => (
              <ExecutionDetail
                key={`execution-detail-${executionDetail.id}`}
                executionDetail={executionDetail}
                showTriggerSnippet={detailId !== executionDetail.id}
                onShowExecutionDetail={onShowExecutionDetail(executionDetail.id, executionDetail.raw)}
                onHideExecutionDetail={onHideExecutionDetail}
              />
            ))}
          </GridColContainer>
        </Grid.Col>
        <Grid.Col span={6}>
          <GridColContainer>
            <When truthy={detailId.length === 0}>
              <ExecutionDetailTrigger identifier={identifier} step={step} subscriberVariables={subscriberVariables} />
            </When>
            <When truthy={detailId.length > 0 && executionDetailsRawSnippet}>
              <ExecutionDetailRawSnippet raw={executionDetailsRawSnippet} onClose={onHideExecutionDetail} />
            </When>
          </GridColContainer>
        </Grid.Col>
      </Grid>
    </ExecutionDetailsStepContentWrapper>
  );
};
