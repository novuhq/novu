import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { useLocation, useParams } from 'react-router-dom';

import { colors, Popover, Text } from '../../design-system';
import { guidePreview, guidePlayground, GuideTitleEnum, IBeat } from './consts';
import { ROUTES } from '../../constants/routes.enum';
import { parseUrl } from '../../utils/routeUtils';
import { OnBoardingAnalyticsEnum } from '../../pages/quick-start/consts';
import { useSegment } from '../providers/SegmentProvider';

export function NodeStep({
  data,
  id,
  Handlers,
  Icon,
  ActionItem,
  ContentItem,
}: {
  data: { label: string };
  id: string;
  Handlers: React.FC<any>;
  Icon: React.FC<any>;
  ActionItem?: React.ReactNode;
  ContentItem?: React.ReactNode;
}) {
  const segment = useSegment();
  const { counter } = useCounter();
  const [sequence, setSequence] = useState<IBeat>();
  const { pathname } = useLocation();
  const { templateId = '' } = useParams<{ templateId: string }>();
  const digestPlaygroundPathname = parseUrl(ROUTES.TEMPLATES_DIGEST_PLAYGROUND, { templateId });
  const isDigestPlayground = pathname === digestPlaygroundPathname;

  const label = data.label.toLowerCase();
  const popoverData = isDigestPlayground ? guidePlayground[label] : guidePreview[label];
  const titleGradient =
    popoverData.title === GuideTitleEnum.DIGEST_PREVIEW || popoverData.title === GuideTitleEnum.DIGEST_PLAYGROUND
      ? 'blue'
      : 'red';

  const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);

  function onUrlClickHandler() {
    segment.track(`${OnBoardingAnalyticsEnum.BUILD_WORKFLOW_NODE_POPOVER_LEARN_MORE_CLICK} On ${capitalizedLabel}`);
  }

  useEffect(() => {
    setSequence(popoverData.sequence[counter.toString()] as IBeat);
  }, [counter]);

  return (
    <Popover
      withArrow
      withinPortal
      opened={sequence?.open || false}
      transition="rotate-left"
      transitionDuration={600}
      opacity={sequence?.opacity ? sequence.opacity : 1}
      target={
        <div>
          <StepCard data-test-id={`data-test-id-${label}`}>
            <ContentContainer>
              <LeftContent>
                <Icon style={{ marginRight: '15px' }} />
                <Text weight={'bold'}>{data.label} </Text>
              </LeftContent>
              {ActionItem}
            </ContentContainer>
            {ContentItem}
          </StepCard>
          <Handlers />
        </div>
      }
      title={popoverData.title}
      titleGradient={titleGradient}
      description={popoverData.description}
      url={popoverData.docsUrl}
      onUrlClick={onUrlClickHandler}
    />
  );
}

const ContentContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  pointer-events: all;
`;

const LeftContent = styled.div`
  display: flex;
  align-items: center;
`;

const StepCard: any = styled.div`
  position: relative;

  display: flex;

  width: 300px;
  height: 75px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  border-radius: 7px;
  pointer-events: none;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B17 : colors.white)};

  margin: 0;
  padding: 20px;
`;

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
