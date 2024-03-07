import styled from '@emotion/styled';
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import PageContainer from '../../../../components/layout/components/PageContainer';
import { ROUTES } from '../../../../constants/routes.enum';
import { currentOnboardingStep } from '../route/store';
import { BodyLayout } from './BodyLayout';
import { FooterLayout } from './FooterLayout';
import { HeaderLayout } from './HeaderLayout';
import { Title } from '@novu/design-system';

interface IGetStartedLayoutProps {
  children?: React.ReactNode;
  footer: {
    leftSide: React.ReactNode;
    rightSide: React.ReactNode;
  };
}

export function GetStartedLayout({ children, footer }: IGetStartedLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    currentOnboardingStep().set(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const route = currentOnboardingStep().get();

    if (route) {
      navigate(route);
    } else {
      navigate(ROUTES.GET_STARTED);
    }
  }, [navigate]);

  return (
    <>
      <PageContainer style={{ display: 'flex' }}>
        <PageWrapper>
          <HeaderLayout>
            <Title>Get started</Title>
          </HeaderLayout>
          <BodyLayout>{children}</BodyLayout>
          <FooterLayout leftSide={footer.leftSide} rightSide={footer.rightSide} />
        </PageWrapper>
      </PageContainer>
    </>
  );
}

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
`;
