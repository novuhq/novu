import React, { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Stack } from '@mantine/core';
import styled from '@emotion/styled';

import { localNavigate } from './route/store';
import PageContainer from '../../../components/layout/components/PageContainer';
import { GoBack } from './route/GoBack';
import { When } from '../../../components/utils/When';
import { colors } from '../../../design-system';
import { Faq } from '../QuickStart';

export function QuickStartWrapper({
  title,
  secondaryTitle,
  description,
  faq = false,
  children,
}: {
  title?: React.ReactNode | string;
  secondaryTitle?: React.ReactNode | string;
  description?: React.ReactNode | string;
  faq?: boolean;
  children: React.ReactNode;
}) {
  const FIRST_PAGE = '/quickstart';

  const { framework } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  if (framework) {
    title = getFrameworkTitle(framework);
  }

  const onlySecondary = !!secondaryTitle && !title && !description;

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
            <When truthy={title}>
              <Title>{title}</Title>
            </When>
            <When truthy={secondaryTitle}>
              <SecondaryTitle onlySecondary={onlySecondary}>{secondaryTitle}</SecondaryTitle>
            </When>
            <When truthy={description}>
              <Description>{description}</Description>
            </When>

            <div style={{ marginBottom: '30px' }} />

            {children}
          </Stack>

          <When truthy={faq}>
            <Faq />
          </When>
        </PageWrapper>
      </PageContainer>
    </>
  );
}

function getFrameworkTitle(framework) {
  return framework === 'demo' ? 'Great Choice!' : 'Let’s set up the Notification Center in your app';
}

const Title = styled.div`
  font-size: 22px;
  color: ${colors.B60};
`;

const SecondaryTitle = styled.div<{ onlySecondary: boolean }>`
  font-size: 30px;
  font-weight: bold;

  margin-top: ${({ onlySecondary }) => {
    return onlySecondary ? '127px' : '0';
  }};
`;

const Description = styled.div`
  font-size: 20px;
  margin-top: 10px;
`;

const PageWrapper = styled.div`
  padding: 42px 30px;
`;
