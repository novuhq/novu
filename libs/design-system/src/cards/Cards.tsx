import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Stack, useMantineColorScheme } from '@mantine/core';
import styled from '@emotion/styled';

import { When } from '../when';
import { colors, shadows } from '../config';
import { Text } from '../typography/text/Text';

interface ICardCell {
  navIcon?: (props: React.ComponentPropsWithoutRef<'svg'>) => JSX.Element | React.ReactNode;
  description?: React.ReactNode | string;
  navigateTo?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  imagePath?: string;
  href?: string;
  disabled?: boolean;
  testId?: string;
}

export function Cards({ cells }: { cells: ICardCell[] }) {
  const spanNumber = 12 / cells.length;

  return (
    <Grid sx={{ justifyContent: 'center' }}>
      {cells.map((cell, index) => (
        <Grid.Col span={spanNumber} key={index} sx={{ maxWidth: 'initial' }}>
          <Card cell={cell} key={index} />
        </Grid.Col>
      ))}
    </Grid>
  );
}

function Card({ cell }: { cell: ICardCell }) {
  const { colorScheme } = useMantineColorScheme();
  const navigate = useNavigate();

  const NavIcon = cell.navIcon
    ? (cell.navIcon as (props: React.ComponentPropsWithoutRef<'svg'>) => JSX.Element)
    : undefined;
  const cardWithIconAndDescription = cell.navIcon;
  const cardWithImage = cell.imagePath;
  const onlyDescription = !cell.imagePath && !cell.navIcon && cell.description;
  const alt = cell.imagePath?.split('/').pop();
  const frameworkName = getFrameworkName(alt);

  const handleOnClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (cell.onClick) {
      cell.onClick?.(e);

      return;
    }

    if (cell.navigateTo) {
      navigate(cell.navigateTo);
    }
  };

  return (
    <StyledCard
      dark={colorScheme === 'dark'}
      onClick={handleOnClick}
      disabled={cell.disabled}
      data-test-id={cell.testId}
    >
      <When truthy={onlyDescription}>
        <Text mt={10} size={'lg'}>
          {cell.description ?? ''}
        </Text>
      </When>

      <When truthy={cardWithIconAndDescription}>
        {NavIcon ? <NavIcon style={{ height: '50px', width: '50px' }} /> : null}
        <Text mt={10} size={'lg'}>
          {cell.description ?? ''}
        </Text>
      </When>

      <When truthy={cardWithImage}>
        <Stack align="center">
          <img src={cell.imagePath} alt={alt} />
          <span style={{ fontSize: '20px', textTransform: 'capitalize' }}>{frameworkName}</span>
        </Stack>
      </When>
    </StyledCard>
  );
}

function getFrameworkName(alt) {
  const framework = alt?.replace('.png', '');

  return framework === 'js' ? 'JS' : framework;
}

const StyledCard = styled.button<{ dark: boolean }>`
  outline: none;
  border: none;
  cursor: pointer;
  background-color: ${({ dark }) => (dark ? colors.B17 : colors.B98)};
  border-radius: 7px;
  height: 180px;
  min-width: 240px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  transition: background-color 0.25s ease, box-shadow 0.25s ease;

  &:disabled {
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
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
