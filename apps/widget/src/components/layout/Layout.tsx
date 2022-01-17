import styled from 'styled-components';
import { Spin } from 'antd';
import { Header } from './Header';
import { Footer } from './Footer';
import { useInitialization } from '../../hooks/use-initialization.hook';

export function Layout({ children }: { children: JSX.Element }) {
  const { initialized } = useInitialization();

  return (
    <LayoutWrapper>
      <Header />
      <ContentWrapper>
        {initialized ? (
          children
        ) : (
          <div
            style={{
              textAlign: 'center',
              minHeight: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Spin />
          </div>
        )}
      </ContentWrapper>
      <Footer />
    </LayoutWrapper>
  );
}

const ContentWrapper = styled.div`
  overflow: auto;
  min-height: 400px;
`;

const LayoutWrapper = styled.div`
  background: white;
  height: auto;
`;
