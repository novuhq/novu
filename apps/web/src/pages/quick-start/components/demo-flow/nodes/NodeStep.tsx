import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';

import { useStyles } from '../../../../../design-system/template-button/TemplateButton.styles';
import { colors, Popover, shadows, Text } from '../../../../../design-system';
import { guidePreview, GuideTitleEnum, IBeat, IGuide } from './consts';

export function NodeStep({
  data,
  id,
  Handlers,
  Icon,
  ActionItem,
}: {
  data: any;
  id: string;
  Handlers: React.FC<any>;
  Icon: React.FC<any>;
  ActionItem?: React.FC<any>;
}) {
  const { theme } = useStyles();
  const { counter } = useCounter();
  const [sequence, setSequence] = useState<IBeat>();

  const label = data.label.toLowerCase();
  const popoverData = guidePreview[label] as IGuide;
  const titleGradient =
    popoverData.title === GuideTitleEnum.DIGEST_PREVIEW || popoverData.title === GuideTitleEnum.DIGEST_PLAYGROUND
      ? 'blue'
      : 'red';

  useEffect(() => {
    setSequence(popoverData.sequence[counter.toString()] as IBeat);
  }, [counter]);

  return (
    <Popover
      opened={sequence?.open || false}
      transition="rotate-left"
      transitionDuration={600}
      target={
        <div>
          <StepCard data-test-id={`data-test-id-${label}`}>
            <ContentContainer>
              <LeftContent>
                <Icon style={{ marginRight: '15px' }} />
                <Text weight={'bold'}>{data.label} </Text>
              </LeftContent>
              {ActionItem ? <ActionItem /> : null}
            </ContentContainer>
          </StepCard>
          <Handlers />
        </div>
      }
      title={popoverData.title}
      titleGradient={titleGradient}
      description={popoverData.description}
      url={popoverData.docsUrl}
    />
  );
}

const ContentContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
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
