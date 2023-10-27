import styled from '@emotion/styled';
import { createStyles, Group, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum, IConfigCredentials } from '@novu/shared';

import { colors, shadows, Text, Tooltip } from '@novu/design-system';
import { useIntegrationLimit } from '../../../hooks';
import type { IIntegratedProvider } from '../types';
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
    isLimitReached,
  } = useIntegrationLimit(provider.channel);

  const unit = provider.channel === ChannelTypeEnum.EMAIL ? 'emails' : 'messages';
  const { classes } = useStyles({ isLimitReached });

  return (
    <Tooltip
      classNames={classes}
      label={<TooltipLabel limit={limit} unit={unit} channel={provider.channel} isLimitReached={isLimitReached} />}
    >
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
              <CardStatusBar active={limit - count > 0 && provider.active} />
            </div>
          </CardFooter>
        </StyledGroup>
      </StyledCard>
    </Tooltip>
  );
}

function TooltipLabel({
  channel,
  limit,
  unit,
  isLimitReached,
}: {
  limit: number;
  unit: string;
  channel: ChannelTypeEnum;
  isLimitReached: boolean;
}) {
  const label = isLimitReached
    ? `You have run out of available ${unit} for this month. Configure a different ${channel} provider to send more.`
    : // eslint-disable-next-line max-len
      `The predefined free Novu provider allows sending ${limit} ${unit} per month. Configure a different ${channel} provider to send more.`;

  return (
    <StyledLabelContainer>
      <StyledLabel isLimitReached={isLimitReached}>{label}</StyledLabel>
    </StyledLabelContainer>
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

const StyledLabelContainer = styled.div`
  width: 300px;
`;

const StyledLabel = styled(Text)<{ isLimitReached: boolean }>`
  word-wrap: break-word;
  white-space: pre-wrap;
  word-break: break-word;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B60 : colors.B40)};

  ${({ isLimitReached }) => {
    if (isLimitReached) {
      return `
      color: ${colors.white};
      `;
    }
  }}
`;

const useStyles = createStyles((theme, { isLimitReached }: { isLimitReached: boolean }) => ({
  tooltip: {
    backgroundColor: isLimitReached ? colors.error : theme.colorScheme === 'dark' ? colors.B20 : colors.BGLight,
    color: colors.B60,
    boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.medium,
    padding: '12px 15px',
    fontSize: '14px',
    fontWeight: 400,
  },
  arrow: {
    backgroundColor: isLimitReached ? colors.error : theme.colorScheme === 'dark' ? colors.B20 : theme.white,
  },
}));
