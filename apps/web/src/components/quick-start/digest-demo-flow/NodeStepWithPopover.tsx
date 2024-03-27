import React, { useEffect, useState } from 'react';

import { useLocation, useParams } from 'react-router-dom';

import { Popover } from '@novu/design-system';
import {
  guidePreview,
  guidePlayground,
  GuideTitleEnum,
  IBeat,
  HINT_MIDDLE_OPACITY,
  HINT_VISIBLE_OPACITY,
} from './consts';
import { ROUTES } from '../../../constants/routes.enum';
import { parseUrl } from '../../../utils/routeUtils';
import { OnBoardingAnalyticsEnum } from '../../../pages/quick-start/consts';
import { useSegment } from '../../providers/SegmentProvider';
import { useDigestDemoFlowContext } from './DigestDemoFlowProvider';
import { NodeStep } from '../../workflow';
import styled from '@emotion/styled';

const getOpacity = (id: string, hoveredHintId?: string, sequence?: { opacity: number }): number => {
  if (hoveredHintId) {
    return hoveredHintId === id ? HINT_VISIBLE_OPACITY : HINT_MIDDLE_OPACITY;
  }

  return sequence?.opacity ?? HINT_VISIBLE_OPACITY;
};

export function NodeStepWithPopover({
  data,
  id,
  Handlers,
  Icon,
  ActionItem,
  ContentItem,
}: {
  data: { label: string; email?: string };
  id: string;
  Handlers: React.FC<any>;
  Icon: React.FC<any>;
  ActionItem?: React.ReactNode;
  ContentItem?: React.ReactNode;
}) {
  const { hoveredHintId, setHoveredHintId } = useDigestDemoFlowContext();
  const segment = useSegment();
  const { counter } = useCounter();
  const [sequence, setSequence] = useState<IBeat>();
  const { pathname } = useLocation();
  const { templateId = '' } = useParams<{ templateId: string }>();
  const digestPlaygroundPathname = parseUrl(ROUTES.WORKFLOWS_DIGEST_PLAYGROUND, { templateId });
  const isDigestPlayground = pathname === digestPlaygroundPathname;

  const label = data.label.toLowerCase();
  const popoverData = isDigestPlayground ? guidePlayground[label] : guidePreview[label];
  const titleGradient =
    popoverData.title === GuideTitleEnum.DIGEST_PREVIEW || popoverData.title === GuideTitleEnum.DIGEST_PLAYGROUND
      ? 'blue'
      : 'red';

  const EMAIL_PLACEHOLDER = '{{email}}';
  const description = !popoverData.description.includes(EMAIL_PLACEHOLDER)
    ? popoverData.description
    : popoverData.description.replace(EMAIL_PLACEHOLDER, data?.email || '');

  function onUrlClickHandler() {
    segment.track(`${OnBoardingAnalyticsEnum.BUILD_WORKFLOW_NODE_POPOVER_LEARN_MORE_CLICK}`, {
      channel: label,
    });
  }

  useEffect(() => {
    setSequence(popoverData.sequence[counter.toString()] as IBeat);
  }, [counter, popoverData]);

  const onDropdownMouseEnter = () => {
    setHoveredHintId(id);
  };

  const onDropdownMouseLeave = () => {
    setHoveredHintId(undefined);
  };

  return (
    <Popover
      withArrow
      withinPortal
      opened={sequence?.open || false}
      transition="rotate-left"
      transitionDuration={600}
      opacity={getOpacity(id, hoveredHintId, sequence)}
      target={
        <StyledDiv onMouseEnter={onDropdownMouseEnter} onMouseLeave={onDropdownMouseLeave}>
          <NodeStep Handlers={Handlers} Icon={Icon} data={data} ActionItem={ActionItem} ContentItem={ContentItem} />
        </StyledDiv>
      }
      title={popoverData.title}
      titleGradient={titleGradient}
      description={description}
      url={popoverData.docsUrl}
      onUrlClick={onUrlClickHandler}
      onDropdownMouseEnter={onDropdownMouseEnter}
      onDropdownMouseLeave={onDropdownMouseLeave}
    />
  );
}

function useCounter() {
  const INTERVAL = 1500;
  const [counter, setCounter] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      if (counter >= 5) {
        clearInterval(interval);

        return;
      }

      setCounter(counter + 1);
    }, INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [counter]);

  return { counter };
}

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
