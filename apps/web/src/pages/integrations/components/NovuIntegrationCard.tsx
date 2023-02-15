import { ChannelTypeEnum, IConfigCredentials } from '@novu/shared';
import styled from '@emotion/styled';
import { Group, useMantineColorScheme } from '@mantine/core';
import { colors, shadows } from '../../../design-system';
import { CardStatusBar } from './CardStatusBar';
import { IIntegratedProvider } from '../IntegrationsStorePage';
import { LimitBar } from './LimitBar';

export function NovuIntegrationCard({
  provider,
  onConnectClick = undefined,
  ribbonText = 'Starting provider',
}: {
  provider: IIntegratedProvider;
  onConnectClick?: (visible: boolean, create: boolean, provider: IIntegratedProvider) => void;
  ribbonText?: string;
}) {
  const { colorScheme } = useMantineColorScheme();
  const logoSrc = provider.logoFileName[`${colorScheme}`];
  const brightCard =
    provider.active ||
    provider.credentials.some((cred: IConfigCredentials) => {
      return !cred.value;
    });

  return (
    <StyledCard
      dark={colorScheme === 'dark'}
      active={brightCard}
      data-test-id="nouv-integration-provider-card"
      onClick={() => {
        if (onConnectClick) {
          onConnectClick(true, true, provider);
        }
      }}
      clickable={onConnectClick !== undefined}
    >
      <RibbonWrapper>
        <Ribbon>{ribbonText}</Ribbon>
      </RibbonWrapper>
      <StyledGroup position="apart">
        <CardHeader>
          <Logo src={logoSrc} alt={provider.displayName} />
        </CardHeader>
        <CardFooter>
          <LimitBar
            channel={provider.channel}
            label={`${provider.channel === ChannelTypeEnum.EMAIL ? 'Email' : 'Sms'} credits used`}
          />
          <div
            style={{
              marginTop: '12px',
            }}
          >
            <CardStatusBar active={provider.active} />
          </div>
        </CardFooter>
      </StyledGroup>
    </StyledCard>
  );
}

const StyledGroup = styled(Group)`
  height: 100%;
  justify-content: space-between;
  flex-direction: column;
`;

const RibbonWrapper = styled.div`
  width: 115px;
  height: 115px;
  position: absolute;
  right: 10px;
  top: 10px;
  transform: rotate(45deg);
`;

const Ribbon = styled.div`
  background: ${colors.success};
  font-size: 9px;
  width: 100%;
  text-align: center;
  color: ${colors.white};
  line-height: 20px;
  font-weight: bold;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;

  svg {
    color: ${colors.B40};
  }
`;

const Logo = styled.img`
  max-width: 140px;
  max-height: 50px;
`;

const CardFooter = styled.div`
  width: 100%;
`;

const StyledCard = styled.div<{ dark: boolean; active: boolean; clickable: boolean }>`
  background-color: ${({ dark }) => (dark ? colors.B17 : colors.B98)};
  border-radius: 7px;
  display: inline-block;
  padding: 25px;
  height: 200px;
  width: 100%;
  min-width: 205px;
  transition: all 0.15s ease-in;
  position: relative;
  overflow: hidden;

  ${({ active }) => {
    return (
      !active &&
      `
      ${Logo} {
        opacity: 0.5;
      }
    `
    );
  }};

  &:hover {
    ${Logo} {
      opacity: 1;
    }
    cursor: ${({ clickable }) => (clickable ? 'pointer' : undefined)};
    ${({ dark, clickable }) =>
      clickable
        ? dark
          ? `
            background-color: ${colors.B20};
            box-shadow: ${shadows.dark};
          `
          : `
            background-color: ${colors.BGLight};
            box-shadow: ${shadows.light};
          `
        : undefined};
  }
`;
