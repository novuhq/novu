import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Grid, Stack, useMantineColorScheme, Stepper } from '@mantine/core';
import styled from '@emotion/styled';
import { colors, shadows, Text } from '../../design-system';
import { When } from '../../components/utils/When';
import { Prism } from '../settings/tabs/components/Prism';
import { demoClone, npmInstall, npmRunCommand, openLocalHost } from './consts';
import { GoBack } from './components/route/GoBack';
import { localNavigate } from './components/route/store';
import { LoaderProceedTernary } from './components/LoaderProceedTernary';
import { useInAppActivated } from './components/useInAppActivated';
import PageContainer from '../../components/layout/components/PageContainer';
export function QuickStartHeader({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title?: React.ReactNode | string;
  description?: React.ReactNode | string;
}) {
  const FIRST_PAGE = '/quickstart';
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    localNavigate().push(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const lastRoute = localNavigate().peek();
    if (lastRoute) {
      navigate(lastRoute);
    }
  }, []);

  function goBackHandler() {
    const route = localNavigate().pop()?.at(-1);

    if (route) {
      navigate(route);
    }
  }

  return (
    <>
      <PageContainer>
        <PageWrapper>
          <GoBack goBackHandler={goBackHandler} display={location.pathname !== FIRST_PAGE} />
          <Stack
            align="center"
            justify="center"
            sx={(theme) => ({
              backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
              height: '100%',
              background: 'border-box',
            })}
          >
            <QuickStartTitle>{title}</QuickStartTitle>
            <QuickStartDescription>{description}</QuickStartDescription>
            {children}
          </Stack>
        </PageWrapper>
      </PageContainer>
    </>
  );
}

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
`;

const QuickStartDescription = styled.div`
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 65px;
`;

function NavCard({ cell }: { cell: ICardCell }) {
  const { colorScheme } = useMantineColorScheme();
  const navigate = useNavigate();

  const NavIcon = cell.navIcon
    ? (cell.navIcon as (props: React.ComponentPropsWithoutRef<'svg'>) => JSX.Element)
    : undefined;
  const cardWithIconAndDescription = cell.navIcon;
  const cardWithImage = cell.imagePath;
  const alt = cell.imagePath?.split('/').pop();

  const handleOnClick = () => {
    if (cell.navigateTo) {
      navigate(cell.navigateTo);
    }
  };

  return (
    <StyledCard dark={colorScheme === 'dark'} onClick={handleOnClick}>
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

const PageWrapper = styled.div`
  padding: 42px 30px;
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

export function QuickStartDemo() {
  const { initialized } = useInAppActivated();

  return (
    <>
      <LoaderProceedTernary appInitialized={initialized} navigatePath={'/quickstart/notification-center/trigger'} />

      <Stepper active={0} onStepClick={() => {}} orientation="vertical">
        <Stepper.Step
          label="Clone the project to your local machine"
          description={<Prism code={`${demoClone}   `} />}
        />
        <Stepper.Step label="Run npm install " description={<Prism code={`${npmInstall}   `} />} />
        <Stepper.Step label="Update .env variable withe the following ones" description="Get full access" />
        <Stepper.Step label="Run npm run dev " description={<Prism code={`${npmRunCommand}   `} />} />
        <Stepper.Step
          label="If the browser did not automatically opened open localhost"
          description={<Prism code={`${openLocalHost}   `} />}
        />
      </Stepper>
    </>
  );
}
