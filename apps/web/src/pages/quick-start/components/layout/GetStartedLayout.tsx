import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';

import PageContainer from '../../../../components/layout/components/PageContainer';
import { HeaderLayout } from './HeaderLayout';
import { BodyLayout } from './BodyLayout';
import { FooterLayout } from './FooterLayout';
import { localNavigate } from '../route/store';

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
    onRouteChangeUpdateNavigationStore();
  }, [location.pathname]);

  useEffect(() => {
    onStepMountNavigateToCurrentStep();
  }, []);

  function onStepMountNavigateToCurrentStep() {
    const lastRoute = localNavigate().peek();
    if (lastRoute) {
      navigate(lastRoute);
    }
  }

  function onRouteChangeUpdateNavigationStore() {
    localNavigate().push(location.pathname);
  }

  return (
    <>
      <PageContainer style={{ minHeight: '100%', display: 'flex' }}>
        <PageWrapper>
          <HeaderLayout />
          <BodyLayout>{children}</BodyLayout>
          <FooterLayout leftSide={footer.leftSide} rightSide={footer.rightSide} />
        </PageWrapper>
      </PageContainer>
    </>
  );
}

const PageWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;

  width: 100%;
`;
