import { IConfigCredentials } from '@novu/shared';
import styled from '@emotion/styled';
import { Group, useMantineColorScheme } from '@mantine/core';

import { Button, colors, shadows, Settings, getGradient } from '@novu/design-system';
import { CardStatusBar } from '../CardStatusBar';
import type { IIntegratedProvider } from '../../types';
import { When } from '../../../../components/utils/When';
import { CONTEXT_PATH } from '../../../../config';

export function ProviderCard({
  provider,
  onConnectClick,
  selected,
}: {
  provider: IIntegratedProvider;
  selected: boolean;
  onConnectClick: (visible: boolean, create: boolean, provider: IIntegratedProvider) => void;
}) {
  const { colorScheme } = useMantineColorScheme();
  const logoSrc = `${CONTEXT_PATH}/static/images/providers/${colorScheme}/${provider.logoFileName[`${colorScheme}`]}`;
  const brightCard =
    provider.active ||
    provider.credentials.some((cred: IConfigCredentials) => {
      return !cred.value;
    });

  function handleOnClickSettings() {
    onConnectClick(true, false, provider);
  }

  return (
    <StyledCard
      dark={colorScheme === 'dark'}
      selected={selected}
      active={brightCard}
      data-test-id={`integration-provider-card-${provider.providerId}`}
      onClick={() => {
        if (provider.comingSoon) return;
        if (provider.connected) {
          handleOnClickSettings();
        } else {
          onConnectClick(true, true, provider);
        }
      }}
    >
      <When truthy={provider.comingSoon || provider.betaVersion}>
        <RibbonWrapper>
          <Ribbon>{provider.comingSoon ? 'COMING SOON' : 'BETA'}</Ribbon>
        </RibbonWrapper>
      </When>

      <StyledGroup position="apart">
        <CardHeader>
          <Logo src={logoSrc} alt={provider.displayName} />
          {provider.connected && !provider.betaVersion && !provider.novu ? (
            <Settings data-test-id="provider-card-settings-svg" />
          ) : null}
        </CardHeader>

        <CardFooter>
          {!provider.connected ? (
            <StyledButton fullWidth variant={'outline'} disabled={provider.comingSoon}>
              Connect
            </StyledButton>
          ) : (
            <CardStatusBar active={provider.active} />
          )}
        </CardFooter>
      </StyledGroup>
    </StyledCard>
  );
}

const StyledButton = styled(Button)`
  background-image: ${({ theme }) =>
    theme.colorScheme === 'dark'
      ? `linear-gradient(0deg, ${colors.B17} 0%, ${colors.B17} 100%),linear-gradient(99deg,#DD2476 0% 0%, #FF512F 100% 100%)`
      : `linear-gradient(0deg, ${colors.B98} 0%, ${colors.B98} 100%),linear-gradient(99deg,#DD2476 0% 0%, #FF512F 100% 100%)`};
`;

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
  background: ${colors.horizontal};
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

const StyledCard = styled.div<{ dark: boolean; active: boolean; selected: boolean }>`
  background-color: ${({ dark }) => (dark ? colors.B17 : colors.B98)};
  box-shadow: ${({ theme }) => (theme.colorScheme === 'dark' ? shadows.dark : shadows.medium)};
  border: 1px solid transparent;
  border-radius: 7px;
  display: inline-block;
  padding: 25px;
  height: 200px;
  width: 100%;
  min-width: 203px;
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

  ${({ selected, dark }) => {
    return selected
      ? `
           background: ${dark ? getGradient(colors.B20) : getGradient(colors.BGLight)} padding-box, ${
          colors.vertical
        } border-box;
      `
      : undefined;
  }};

  &:hover {
    ${Logo} {
      opacity: 1;
    }
    cursor: pointer;
    ${({ dark }) =>
      dark
        ? `
            background-color: ${colors.B20};
            box-shadow: ${shadows.dark};
          `
        : `
            background-color: ${colors.BGLight};
            box-shadow: ${shadows.light};
          `};
  }
`;
