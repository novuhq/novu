import styled from '@emotion/styled';
import { Box, Group, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum, IConfigCredentials } from '@novu/shared';
import { colors, shadows, Text, Tooltip } from '../../../design-system';
import { useIntegrationLimit } from '../../../hooks';
import { IIntegratedProvider } from '../IntegrationsStorePage';
import { CardStatusBar } from './CardStatusBar';
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

  const {
    data: { limit, count },
    loading,
  } = useIntegrationLimit(provider.channel);

  const unit = provider.channel === ChannelTypeEnum.EMAIL ? 'emails' : 'messages';

  return (
    <Tooltip label={<TooltipLabel limit={limit} unit={unit} channel={provider.channel} />}>
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
            <LimitBar channel={provider.channel} limit={limit} count={count} loading={loading} />
            <div
              style={{
                marginTop: '12px',
              }}
            >
              <CardStatusBar active={count > 0 && provider.active} />
            </div>
          </CardFooter>
        </StyledGroup>
      </StyledCard>
    </Tooltip>
  );
}

function TooltipLabel({ channel, limit, unit }: { limit: number; unit: string; channel: ChannelTypeEnum }) {
  return (
    <Box w={300}>
      <StyledLabel>
        The predefined free Novu provider allows sending {limit} {unit} per month. Configure a different {channel}{' '}
        provider to send more.
      </StyledLabel>
    </Box>
  );
}

const StyledGroup = styled(Group)`
  height: 100%;
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

const StyledLabel = styled(Text)`
  word-wrap: break-word;
  white-space: pre-wrap;
  word-break: break-word;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B60 : colors.B40)};
`;
