import styled from '@emotion/styled';
import { colors, Text } from '@novu/design-system';

export function MessageContainer({ isDark }: { isDark: boolean }) {
  return (
    <>
      <Wrapper isDark={isDark}>
        <StyledTitle>YOUR ACTIVITY FEED</StyledTitle>
        <StyledText>Here you will see the activity graph once you send some events</StyledText>
      </Wrapper>
    </>
  );
}

const Wrapper = styled.div<{ isDark: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  position: absolute;
  padding: 12px 15px 14px;
  height: 64px;
  background: ${({ isDark }) => {
    return isDark ? colors.B20 : colors.white;
  }};
  box-shadow: 0 5px 15px rgba(38, 68, 128, 0.05);

  border-radius: 7px;
  z-index: 2;

  &:after {
    display: inline-block;
    bottom: -9px;
    content: '';
    position: absolute;
    left: calc(50% - 5px);
    border-top: 10px solid
      ${({ isDark }) => {
        return isDark ? colors.B20 : colors.white;
      }};
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
  }
`;

const StyledTitle = styled(Text)`
  background: -webkit-linear-gradient(90deg, #dd2476 0%, #ff512f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 11px;
  margin: 12px 0 8px 0;
`;

const StyledText = styled(Text)`
  margin: 0 15px 14px 15px;
`;
