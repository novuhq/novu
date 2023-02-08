import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Grid, Stack, useMantineColorScheme, Loader } from '@mantine/core';
import styled from '@emotion/styled';
import { colors, shadows, Text, Title } from '../../design-system';
import { When } from '../../components/utils/When';
export function QuickStartHeader({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title?: React.ReactNode | string;
  description?: React.ReactNode | string;
}) {
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('client_location', location.pathname);
  }, []);

  return (
    <Stack
      align="center"
      justify="center"
      sx={(theme) => ({
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
        height: '100%',
      })}
    >
      <QuickStartTitle>{title}</QuickStartTitle>
      <QuickStartDescription>{description}</QuickStartDescription>
      {children}
    </Stack>
  );
}

export function QuickStartCards({ cells }: { cells: ICardCell[] }) {
  const spanNumber = 12 / cells.length;

  return (
    <Grid mb={50}>
      {cells.map((cell, index) => (
        <Grid.Col span={spanNumber} key={index}>
          <NavCard cell={cell} />
        </Grid.Col>
      ))}
    </Grid>
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

export function TroubleshootingDescription() {
  return (
    <Stack align="center">
      <InlineDiv>
        <span>To proceed, complete the </span>
        <a href={'https://docs.novu.co/notification-center/getting-started'} style={{ color: '#DD2476 ' }}>
          guide
        </a>

        <span> related to your client framework.</span>
      </InlineDiv>
      <HelpNeeded />
    </Stack>
  );
}

export function HelpNeeded() {
  return (
    <InlineDiv>
      <Text size={'lg'}>
        If you have any questions or need further assistance, please feel free to reach out to us via our
      </Text>
      <a
        href={'https://docs.novu.co/notification-center/getting-started'}
        style={{ color: '#DD2476 ', fontSize: '16px', margin: '0 5px' }}
      >
        Discord
      </a>
      <Text size={'lg'}>server in the support channel.</Text>
    </InlineDiv>
  );
}

const QuickStartTitle = styled.div`
  font-size: 22px;
  color: ${colors.B60};
  margin-top: -100px;
`;

const QuickStartDescription = styled.div`
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 65px;
`;

function NavCard({ cell }: { cell: ICardCell }) {
  const { colorScheme } = useMantineColorScheme();
  const navigate = useNavigate();

  const NavIcon = cell.navIcon as (props: React.ComponentPropsWithoutRef<'svg'>) => JSX.Element;
  const cardWithIconAndDescription = cell.description && cell.navIcon;
  const cardWithImage = cell.imagePath;
  const alt = cell.imagePath?.split('/').pop();

  const handleOnClick = () => {
    if (cell.navigateTo) {
      navigate(cell.navigateTo);
    }

    if (cell.href) {
      navigate('/quickstart/notification-center/trouble-shooting');
      // window.open(cell.href, '_blank');
    }
  };

  return (
    <StyledCard dark={colorScheme === 'dark'} onClick={handleOnClick}>
      <When truthy={cardWithIconAndDescription}>
        <NavIcon style={{ height: '48px', width: '39px' }} />
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
`;

export const DelayedRender = ({ component, delay }: { component: JSX.Element; delay: number }) => {
  const [showComponent, setShowComponent] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setShowComponent(true);
    }, delay);
  }, []);

  return showComponent ? <>{component}</> : <WrappedLoader size={100} variant={'bars'} />;
};

const WrappedLoader = styled(Loader)`
  height: 265px;
`;

interface ICardCell {
  navIcon?: (props: React.ComponentPropsWithoutRef<'svg'>) => JSX.Element;
  description?: string;
  navigateTo?: string;
  imagePath?: string;
  href?: string;
}

const InlineDiv = styled.div`
  display: flex;
  flex-direction: row;
  font-size: 30px;
  font-weight: bold;

  span {
    margin: 0 5px;
  }
`;

export const welcomeDescription = 'Welcome to Novu, let’s get started';

export function QuickStartDemo() {
  return <Title>Demo app</Title>;
}
