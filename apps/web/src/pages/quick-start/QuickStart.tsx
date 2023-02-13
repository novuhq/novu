import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Center, Grid, Stack, useMantineColorScheme } from '@mantine/core';
import styled from '@emotion/styled';

import { colors, shadows, Text } from '../../design-system';
import { When } from '../../components/utils/When';
import { Smiley } from '../../design-system/icons/gradient/Smiley';
import { faqUrl } from './consts';
import { BellGradient } from '../../design-system/icons';

export function QuickStartCards({ cells }: { cells: ICardCell[] }) {
  const spanNumber = 12 / cells.length;

  return (
    <Grid mb={50}>
      {cells.map((cell, index) => (
        <Grid.Col span={spanNumber} key={index}>
          <NavCard cell={cell} key={index} />
        </Grid.Col>
      ))}
    </Grid>
  );
}

export function QuickstartDescription() {
  return (
    <Stack align="center" spacing="xs">
      <span>Novu integrates with all communication channels -</span>
      <span>Email, SMS, Chat Apps (WhatsApp, Slack...), Push and Notification Center</span>
    </Stack>
  );
}

export function ImplementationDescription() {
  return (
    <Stack align="center">
      <span>Creating beautiful and powerful apps is now at your fingertips.</span>
      <span>What's your go-to frontend framework?</span>
    </Stack>
  );
}

export function Faq() {
  return (
    <Center
      data-test-id="go-back-button"
      inline
      style={{
        cursor: 'pointer',
        marginTop: '75px',
      }}
    >
      <span style={{ color: colors.B60 }}>Got stuck? </span>
      <a href={faqUrl} style={{ marginLeft: '5px', color: '#DD2476' }}>
        Check our FAQ’s
      </a>
    </Center>
  );
}

export function TroubleshootingDescription() {
  return (
    <Stack align="center">
      <span>Follow the installation steps and then sit back while we</span>
      <span>connect to your application</span>
    </Stack>
  );
}

export function NcInAppDescription() {
  return (
    <Stack align="center" spacing="xs">
      <span>I have an app!</span>
      <span>let’s add a Notification Center to my app.</span>
    </Stack>
  );
}

export function TriggerDescription() {
  return (
    <span>
      Now let's ring the nc in your app
      <BellGradient style={{ margin: '0px 5px 0', top: '8px', position: 'relative' }} />
      in your app
    </span>
  );
}

export function NcDemoDescription() {
  return (
    <Stack align="center" spacing="xs">
      <span>I want to quickly start</span>
      <span>
        with a demo app <Smiley style={{ height: '16px' }} />
      </span>
    </Stack>
  );
}

function NavCard({ cell }: { cell: ICardCell }) {
  const { colorScheme } = useMantineColorScheme();
  const navigate = useNavigate();

  const NavIcon = cell.navIcon
    ? (cell.navIcon as (props: React.ComponentPropsWithoutRef<'svg'>) => JSX.Element)
    : undefined;
  const cardWithIconAndDescription = cell.navIcon;
  const cardWithImage = cell.imagePath;
  const onlyDescription = !cell.imagePath && !cell.navIcon && cell.description;
  const alt = cell.imagePath?.split('/').pop();

  const handleOnClick = () => {
    if (cell.navigateTo) {
      navigate(cell.navigateTo);
    }
  };

  return (
    <StyledCard dark={colorScheme === 'dark'} onClick={handleOnClick}>
      <When truthy={onlyDescription}>
        <Text mt={10} size={'lg'}>
          {cell.description ?? ''}
        </Text>
      </When>

      <When truthy={cardWithIconAndDescription}>
        {NavIcon ? <NavIcon style={{ height: '48px', width: '39px' }} /> : null}
        <Text mt={10} size={'lg'}>
          {cell.description ?? ''}
        </Text>
      </When>

      <When truthy={cardWithImage}>
        <img src={cell.imagePath} alt={alt} />
      </When>
    </StyledCard>
  );
}

const StyledCard = styled.div<{ dark: boolean }>`
  background-color: ${({ dark }) => (dark ? colors.B17 : colors.B98)};
  border-radius: 7px;
  height: 200px;
  min-width: 320px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;

  &:hover {
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

  opacity: 0;
  transform: translateY(20px);
  animation: showUp 0.3s ease-out forwards;

  @keyframes showUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

interface ICardCell {
  navIcon?: (props: React.ComponentPropsWithoutRef<'svg'>) => JSX.Element;
  description?: React.ReactNode | string;
  navigateTo?: string;
  imagePath?: string;
  href?: string;
}
