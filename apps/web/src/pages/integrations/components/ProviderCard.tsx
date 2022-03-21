import React from 'react';
import styled from '@emotion/styled';
import { Group, useMantineColorScheme } from '@mantine/core';
import { Button, colors, shadows } from '../../../design-system';
import { CardStatusBar } from './CardStatusBar';
import { Settings } from '../../../design-system/icons';
import { IIntegratedProvider } from '../IntegrationsStorePage';

export function ProviderCard({
  provider,
  onConnectClick,
}: {
  provider: IIntegratedProvider;
  onConnectClick: (visible: boolean, create: boolean, provider: IIntegratedProvider) => void;
}) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const logoSrc = `/static/images/providers/${isDark ? 'dark' : 'light'}/${provider.providerId}.png`;

  function handleOnClickSettings() {
    onConnectClick(true, false, provider);
  }

  function handlerConnectButton() {
    return () => onConnectClick(true, true, provider);
  }

  return (
    <StyledCard colorScheme={colorScheme} active={provider.active}>
      {provider.comingSoon && (
        <RibbonWrapper>
          <ComingSoonRibbon>COMING SOON</ComingSoonRibbon>
        </RibbonWrapper>
      )}
      <StyledGroup position="apart" direction="column">
        <CardHeader>
          <Logo src={logoSrc} alt={provider.displayName} />
          {provider.connected ? <Settings onClick={handleOnClickSettings} /> : null}
        </CardHeader>

        <CardFooter>
          {!provider.connected ? (
            <Button fullWidth onClick={handlerConnectButton()}>
              Connect
            </Button>
          ) : (
            <CardStatusBar active={provider.active} />
          )}
        </CardFooter>
      </StyledGroup>
    </StyledCard>
  );
}

const StyledGroup = styled(Group)`
  height: 100%;
  justify-content: space-between;
`;

const RibbonWrapper = styled.div`
  width: 115px;
  height: 115px;
  position: absolute;
  right: 10px;
  top: 10px;
  transform: rotate(45deg);
`;

const ComingSoonRibbon = styled.div`
  background: ${colors.horizontal};
  font-size: 9px;
  width: 100%;
  text-align: center;
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
  max-height: 70px;
`;

const CardFooter = styled.div`
  width: 100%;
`;

const StyledCard = styled.div<{ colorScheme: 'dark' | 'light'; active: boolean }>`
  background-color: ${({ colorScheme }) => (colorScheme === 'dark' ? colors.B17 : colors.B98)};
  border-radius: 7px;
  display: inline-block;
  padding: 25px;
  height: 200px;
  width: 100%;
  transition: all 0.15s ease-in;
  position: relative;
  overflow: hidden;

  ${({ active }) => {
    return (
      !active &&
      `
      ${Logo} {
        opacity: 0.3;
      }
    `
    );
  }};

  &:hover {
    ${({ active }) => active && 'cursor: pointer'}

    ${({ colorScheme }) =>
      colorScheme === 'dark'
        ? `
            background-color: ${colors.B20};
            box-shadow: ${shadows.dark};
          `
        : `
            background-color: ${colors.BGLight};
            box-shadow: ${shadows.light};
          `}
  }
`;
