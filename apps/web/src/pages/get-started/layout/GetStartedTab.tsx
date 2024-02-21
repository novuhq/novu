import styled from '@emotion/styled';
import { Grid, Loader, NumberInput, Skeleton } from '@mantine/core';

import {
  ArrowLeft,
  Button,
  colors,
  CountdownTimer,
  DigestAction,
  Text,
  BoltOutlinedGradient,
  EmailFilled,
} from '@novu/design-system';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Card from '../../../components/layout/components/Card';
import { Timeline } from '../components/timeline/Timeline';
import { GetStartedTabsViewsEnum } from '../consts/GetStartedTabsViewsEnum';
import { IOnboardingStep, IOnboardingUseCaseViewContext, OnboardingUseCase, UseCaseViewContext } from '../consts/types';
import { DigestPlaygroundAnalyticsEnum } from '../../templates/constants';
import { useSegment } from '../../../components/providers/SegmentProvider';
import {
  DigestDemoFlowProvider,
  useDigestDemoFlowContext,
} from '../../../components/quick-start/digest-demo-flow/DigestDemoFlowProvider';
import ReactFlow, { Handle, Position, ReactFlowProvider, useReactFlow } from 'react-flow-renderer';
import { useTemplateFetcher } from '../../../api/hooks';
import { digestDemoConfigurations } from '../../../components/quick-start/digest-demo-flow/DigestDemoFlow';
import { useInterval, useResizeObserver } from '@mantine/hooks';
import { WorkflowWrapper } from '../../../components/quick-start/common';
import { NodeStep } from '../../../components/workflow';
import { useNumberInputStyles } from '../../../components/quick-start/digest-demo-flow/DigestNode';
import { useDataRef } from '../../../hooks';
import { Indicator } from '../../../components/quick-start/digest-demo-flow/Indicator';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { AdditionInformationLink } from '../components/AdditionInformationLink';

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
  const segment = useSegment();

  const shouldShowBreadcrumb = !!currentView && views && !!views[currentView];

  const handleRunTriggerClick = useCallback(() => {
    segment.track(DigestPlaygroundAnalyticsEnum.RUN_TRIGGER_CLICK);
  }, [segment]);

  const handleDigestIntervalChange = useCallback(
    (interval: number) => {
      segment.track(DigestPlaygroundAnalyticsEnum.DIGEST_INTERVAL_CHANGE, { interval });
    },
    [segment]
  );

  const { steps, Demo, title, description, BottomSection, type, useCaseLink } = useMemo(() => {
    if (!currentView || !views) {
      return tabProps;
    }

    return views[currentView] ?? tabProps;
  }, [views, currentView, tabProps]);

  const workflowIdentifier = type;

  return (
    <ReactFlowProvider>
      <DigestDemoFlowProvider
        isReadOnly={false}
        templateId={workflowIdentifier}
        onRunTriggerClick={handleRunTriggerClick}
        onDigestIntervalChange={handleDigestIntervalChange}
      >
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
            <Demo>
              <DigestReactFlowDemo workflowIdentifier={workflowIdentifier} />
            </Demo>
          </Grid.Col>
        </Grid>
      </DigestDemoFlowProvider>
    </ReactFlowProvider>
  );
}

export function DigestReactFlowDemo({ workflowIdentifier }: { workflowIdentifier: string }) {
  const { nodes, edges } = digestDemoConfigurations;
  const [ref, rect] = useResizeObserver();
  const reactFlowInstance = useReactFlow();

  const { isInitialLoading: isLoadingTemplate } = useTemplateFetcher(
    { templateId: workflowIdentifier },
    { enabled: !!workflowIdentifier, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    reactFlowInstance.fitView({ minZoom: 1, maxZoom: 1 });
  }, [reactFlowInstance, rect.width, rect.height]);

  return (
    <WorkflowWrapper ref={ref} height="500px">
      {isLoadingTemplate ? (
        <Skeleton width={600} height={500} sx={{ margin: '0 auto' }} />
      ) : (
        <ReactFlow
          fitView
          fitViewOptions={{ minZoom: 1, maxZoom: 1 }}
          minZoom={1}
          maxZoom={1}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          zoomOnScroll={false}
          zoomOnPinch={false}
          panOnDrag={false}
          panOnScroll={false}
          preventScrolling={false}
        />
      )}
    </WorkflowWrapper>
  );
}

export interface IUsecaseTimelineContainerProps {
  shouldShowBreadcrumb: undefined | boolean;
  onClick: () => void;
  title: string;
  description: string | undefined;
  steps: IOnboardingStep[];
  BottomSection?: React.ComponentType<UseCaseViewContext>;
  view: (view: GetStartedTabsViewsEnum | null) => void;
  Demo: React.ComponentType<UseCaseViewContext>;
}

const Description = styled(Text)`
  color: ${colors.B60};
  line-height: 1.5rem;
`;

const nodeTypes = { triggerNode: TriggerNode, digestNode: DigestNode, emailNode: EmailNode };

export function TriggerNode({ data, id }: { data: any; id: string }) {
  return (
    <StyledDiv id={id}>
      <NodeStep
        Handlers={() => {
          return (
            <>
              <Handle type="source" id="a" position={Position.Bottom} />
            </>
          );
        }}
        Icon={BoltOutlinedGradient}
        data={data}
      />
    </StyledDiv>
  );
}

function DigestNode({ data, id }: { data: any; id: string }) {
  const { isReadOnly, triggerCount, isRunningDigest, digestInterval, updateDigestInterval } =
    useDigestDemoFlowContext();
  const { classes } = useNumberInputStyles();

  const [seconds, setSeconds] = useState(0);
  const interval = useInterval(() => setSeconds((sec) => sec - 1), 1000);
  const intervalRef = useDataRef({ interval, digestInterval });

  useEffect(() => {
    const { interval: intervalObject, digestInterval: currentDigestInterval } = intervalRef.current;
    if (isRunningDigest) {
      setSeconds(currentDigestInterval);
      intervalObject.start();
    } else {
      intervalObject.stop();
    }

    return intervalObject.stop;
  }, [isRunningDigest, intervalRef]);

  const digestIntervalDisplay = !isRunningDigest ? undefined : seconds;

  return (
    <>
      <StyledDiv id={id}>
        <NodeStep
          Icon={DigestAction}
          data={data}
          Handlers={() => {
            return (
              <>
                <Handle type="target" id="b" position={Position.Top} />
                <Handle type="source" id="a" position={Position.Bottom} />
              </>
            );
          }}
          ActionItem={
            <NumberInput
              value={digestIntervalDisplay}
              onChange={updateDigestInterval}
              max={30}
              min={10}
              parser={(value) => (value ?? '').replace(/( \w+)|(\D{1,3})/g, '')}
              formatter={(value) => `${value} ${digestIntervalDisplay ? 'sec' : ''}`}
              icon={digestIntervalDisplay ? <CountdownTimer /> : null}
              disabled={true}
              classNames={classes}
            />
          }
          ContentItem={
            <>
              <Indicator
                isShown={!isReadOnly && triggerCount > 0}
                value={triggerCount > 99 ? '99' : `${triggerCount}`}
              />
              {isRunningDigest && <LoaderStyled color={colors.B70} size={16} />}
            </>
          }
        />
      </StyledDiv>
    </>
  );
}

export function EmailNode({ data, id }: { data: any; id: string }) {
  const { currentUser } = useAuthContext();
  const { emailsSentCount } = useDigestDemoFlowContext();
  data.email = currentUser?.email ?? '';

  return (
    <StyledDiv id={id}>
      <NodeStep
        data={data}
        Icon={EmailFilled}
        ContentItem={
          <>
            <Indicator isShown={emailsSentCount > 0} value={emailsSentCount > 99 ? '99' : `${emailsSentCount}`} />
          </>
        }
        Handlers={() => {
          return (
            <>
              <Handle type="target" id="b" position={Position.Top} />
            </>
          );
        }}
      />
    </StyledDiv>
  );
}

const LoaderStyled = styled(Loader)`
  position: absolute;
  bottom: 4px;
  right: 4px;
`;

const StyledDiv = styled.div`
  svg {
    stop:first-of-type {
      stop-color: #dd2476 !important;
    }
    stop:last-child {
      stop-color: #ff512f !important;
    }
  }

  [data-blue-gradient-svg] {
    stop:first-of-type {
      stop-color: #4c6dd4 !important;
    }
    stop:last-child {
      stop-color: #66d9e8 !important;
    }
  }
`;
