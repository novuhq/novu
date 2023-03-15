import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { Popover } from '@mantine/core';
import { useLocation, useParams } from 'react-router-dom';

import { useStyles } from '../../design-system/template-button/TemplateButton.styles';
import { colors, shadows, Text } from '../../design-system';
import { guidePreview, guidePlayground, GuideTitleEnum, IBeat } from './consts';
import { useSegment } from '../providers/SegmentProvider';
import { When } from '../utils/When';
import { ROUTES } from '../../constants/routes.enum';
import { parseUrl } from '../../utils/routeUtils';

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
  const { theme } = useStyles();
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
      position="right"
      radius="md"
      shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
      offset={30}
    >
      <Popover.Target>
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
      </Popover.Target>
      <Popover.Dropdown
        style={{
          height: '100px',
          padding: '16px',
          backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.white,
        }}
      >
        <Label gradientColor={titleGradient} style={{ marginBottom: '8px' }}>
          {popoverData.title}
        </Label>
        <Description description={popoverData.description} url={popoverData.docsUrl} label={label} />
      </Popover.Dropdown>
    </Popover>
  );
}

export const Label = styled.div<{ gradientColor: 'red' | 'blue' | 'none' }>`
  height: 20px;
  font-family: 'Lato', serif;
  font-style: normal;
  font-weight: 700;
  font-size: 16px;
  line-height: 20px;

  display: flex;
  align-items: center;

  ${({ gradientColor }) => {
    return (
      gradientColor !== 'none' &&
      `
    background: ${
      gradientColor === 'red'
        ? 'linear-gradient(90deg, #DD2476 0%, #FF512F 100%)'
        : 'linear-gradient(0deg, #14deeb 0%, #446edc 100%)'
    };
        
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;  
      `
    );
  }};
`;

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
      if (counter >= 4) {
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

export function Description({ label, description, url }: { label: string; description: string; url?: string }) {
  const segment = useSegment();

  function handleOnClick() {
    /*
     * todo add ('label' will probably be needed here)
     * segment.track(OnBoardingAnalyticsEnum);
     */
  }

  return (
    <div style={{ maxWidth: '220px' }}>
      <span>{description}</span>
      <When truthy={url}>
        <a
          href={url}
          style={{ color: '#DD2476', textDecoration: 'underline' }}
          onClick={() => handleOnClick}
          target="_blank"
          rel="noreferrer"
        >
          Learn More
        </a>
      </When>
    </div>
  );
}
