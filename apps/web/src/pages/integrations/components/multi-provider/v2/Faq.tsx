import styled from '@emotion/styled';
import { useMantineColorScheme } from '@mantine/core';
import { colors, Text, Discord } from '@novu/design-system';
import { useIntercom } from 'react-use-intercom';

import { useSegment } from '../../../../../components/providers/SegmentProvider';
import { INTERCOM_APP_ID } from '../../../../../config';
import { discordInviteUrl, notificationCenterDocsUrl, OnBoardingAnalyticsEnum } from '../../../../quick-start/consts';

export function Faq() {
  const segment = useSegment();

  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  function handleOnDocsClick() {
    segment.track(OnBoardingAnalyticsEnum.CLICKED_DOCS);
  }

  function handleOnCommunityClick() {
    segment.track(OnBoardingAnalyticsEnum.CLICKED_ASK_COMMUNITY);
  }

  function handleOnHelpRequestClick() {
    segment.track(OnBoardingAnalyticsEnum.CLICKED_HELP_REQUEST);
  }

  return (
    <Text color={isDark ? colors.B70 : colors.B60}>
      <span style={{ fontWeight: 800 }}>Got stuck? </span>
      <span>Please send us a </span>

      {INTERCOM_APP_ID ? (
        <HelpRequestWithIntercom handleClick={handleOnHelpRequestClick} />
      ) : (
        <GradientSpan>help request, </GradientSpan>
      )}

      <span>ask the </span>
      <GradientSpan onClick={handleOnCommunityClick}>
        <a href={discordInviteUrl} target="_blank" rel="noreferrer">
          <Discord /> <span>community </span>
        </a>
      </GradientSpan>
      <span>or discover </span>
      <GradientSpan>
        <a href={notificationCenterDocsUrl} onClick={handleOnDocsClick} target="_blank" rel="noreferrer">
          our docs.
        </a>
      </GradientSpan>
    </Text>
  );
}

function HelpRequestWithIntercom({ handleClick }: { handleClick: () => void }) {
  const { show } = useIntercom();

  return (
    <GradientSpan
      onClick={() => {
        show();
        handleClick();
      }}
    >
      help request
    </GradientSpan>
  );
}

function getFrameworkTitle(framework) {
  return framework === 'demo' ? 'Great Choice!' : 'Quick Installation Guide';
}

const PageWrapper = styled.div`
  position: relative;
  flex: 1;
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
`;

const HeaderWrapper = styled.div`
  padding: 42px 30px 0px 30px;
`;

const Title = styled.div`
  font-size: 28px;
  font-weight: 800;
  line-height: 1.4;
  color: ${colors.B40};
`;

const SecondaryTitle = styled.div<{ onlySecondary: boolean }>`
  font-size: 16px;
  line-height: 1.25;

  margin-top: ${({ onlySecondary }) => {
    return onlySecondary ? '127px' : '0';
  }};
`;

const Description = styled.div`
  font-size: 20px;
  margin-top: 10px;
`;

const ChildrenWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding-inline: 30px;
`;

const GradientSpan = styled.span`
  background: ${colors.horizontal};
  background-clip: text;
  text-fill-color: transparent;

  &:hover {
    cursor: pointer;
  }
`;
