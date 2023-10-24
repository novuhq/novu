import styled from '@emotion/styled';
import { Group, Overlay } from '@mantine/core';
import { colors, shadows, Text } from '@novu/design-system';
import InAppSandboxWorkflow from './InAppSandboxWorkflow';
import { YourAppHeaderSection } from './YourAppHeaderSection';

export function InAppSandbox({ showOverlay = false }: { showOverlay?: boolean }) {
  return (
    <Wrapper>
      <YourAppWrapper>
        {showOverlay && (
          <Overlay
            zIndex={5}
            opacity={0.3}
            color="#000"
            sx={{
              borderRadius: '7px',
            }}
          />
        )}
        <TitleBar>
          <Ellipses isTransparent={false} />
          <Text>Your app or Demo app</Text>
          <Ellipses isTransparent={true} />
        </TitleBar>
        <YourAppContent>
          <YourAppHeaderSection />
        </YourAppContent>
        <NovuUIWrapper>
          <TitleBar>
            <Ellipses isTransparent={false} />
            <Text>Novu UI</Text>
            <Ellipses isTransparent={true} />
          </TitleBar>
          <GrowContainer>
            <InAppSandboxWorkflow />
          </GrowContainer>
        </NovuUIWrapper>
      </YourAppWrapper>
    </Wrapper>
  );
}

function Ellipses({ isTransparent }: { isTransparent: boolean }) {
  return (
    <Group spacing={4}>
      <Ellipse isTransparent={isTransparent} />
      <Ellipse isTransparent={isTransparent} />
      <Ellipse isTransparent={isTransparent} />
    </Group>
  );
}

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const YourAppWrapper = styled.div`
  position: relative;
  width: 800px;
  height: 415px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight)};
  border-radius: 8px;
  box-shadow: ${shadows.dark};
`;

const YourAppContent = styled.div`
  flex-grow: 1;
  padding-inline: 16px;
  overflow: hidden;
`;

const NovuUIWrapper = styled.div`
  position: absolute;
  top: 48px;
  left: -28px;
  border-radius: 8px;
  width: 475px;
  height: 352px;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.BGLight)};

  box-shadow: ${({ theme }) => (theme.colorScheme === 'dark' ? shadows.dark : shadows.medium)};
  display: flex;
  flex-direction: column;
  z-index: 6;
`;

const GrowContainer = styled.div`
  flex: 1;
`;

const TitleBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px 8px 0 0;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B20 : colors.white)};
  height: 28px;
  min-height: 28px;
  padding: 4px 12px;
  width: 100%;
  overflow: hidden;
`;

const Ellipse = styled.div<{ isTransparent: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ isTransparent, theme }) => {
    if (isTransparent) {
      return 'transparent';
    }

    return theme.colorScheme === 'dark' ? colors.BGDark : colors.B70;
  }};
`;
