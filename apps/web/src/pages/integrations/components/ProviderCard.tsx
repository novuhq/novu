import React from 'react';
import styled from '@emotion/styled';
import { Group, useMantineColorScheme } from '@mantine/core';
import { IProviderConfig } from '@notifire/shared';
import { Button, colors, shadows } from '../../../design-system';
import { CardStatusBar } from './CardStatusBar';
import { Settings } from '../../../design-system/icons';

export function ProviderCard({
  provider,
  connected,
  active,
  showModal,
}: {
  provider: IProviderConfig;
  connected: boolean;
  active: boolean;
  showModal: (visible: boolean, provider: IProviderConfig) => void;
}) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const logoSrc = `/static/images/providers/${isDark ? 'dark' : 'light'}/${provider.id}.png`;
  const isProviderConnected = connected && active;

  return (
    <StyledCard colorScheme={colorScheme} active={active}>
      {provider.comingSoon && (
        <RibbonWrapper>
          <ComingSoonRibbon>COMING SOON</ComingSoonRibbon>
        </RibbonWrapper>
      )}
      <Group position="apart" direction="column" styles={{ root: { height: '100%', justifyContent: 'space-between' } }}>
        <CardHeader>
          <Logo src={logoSrc} alt={provider.displayName} />
          {isProviderConnected ? <Settings /> : null}
        </CardHeader>

        <CardFooter>
          {!isProviderConnected ? (
            <Button fullWidth onClick={() => showModal(true, provider)}>
              Connect
            </Button>
          ) : (
            <CardStatusBar active={active} />
          )}
        </CardFooter>
      </Group>
    </StyledCard>
  );
}

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
