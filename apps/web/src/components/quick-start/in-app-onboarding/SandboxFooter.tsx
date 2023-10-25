import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes.enum';
import { Button, colors, shadows } from '@novu/design-system';
import { OnBoardingAnalyticsEnum } from '../../../pages/quick-start/consts';
import { useSegment } from '../../providers/SegmentProvider';

export function SandboxFooter() {
  const navigate = useNavigate();
  const segment = useSegment();

  function handleConfigureLater() {
    navigate(ROUTES.WORKFLOWS);
    segment.track(OnBoardingAnalyticsEnum.CONFIGURE_LATER_CLICK, { screen: 'in-app sandbox' });
  }

  function handleTryDemoApp() {
    navigate(`${ROUTES.QUICK_START_SETUP}/demo`);
  }

  function handleEmbedInYourApp() {
    navigate(ROUTES.QUICK_START_SETUP);
  }

  return (
    <FooterWrapper>
      <div>
        <Button variant="outline" onClick={handleConfigureLater}>
          Configure Later
        </Button>
      </div>
      <EndSection>
        <Button variant="outline" onClick={handleTryDemoApp}>
          Try the Demo App
        </Button>

        <Button variant="gradient" onClick={handleEmbedInYourApp}>
          Embed in Your App
        </Button>
      </EndSection>
    </FooterWrapper>
  );
}

const FooterWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 88px;
  max-height: 88px;
  padding: 24px;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.white)};
  shadow: ${({ theme }) => (theme.colorScheme === 'dark' ? shadows.dark : shadows.medium)};
  border-radius: 0px 0px 7px 7px;
  border-top: ${({ theme }) =>
    theme.colorScheme === 'dark' ? `1px solid ${colors.BGDark}` : `1px solid ${colors.BGLight}`};
  margin-top: auto;
`;

const EndSection = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  margin-left: auto;
`;
