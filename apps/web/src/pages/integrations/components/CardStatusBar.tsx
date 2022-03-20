import styled from '@emotion/styled';
import { BellGradient, Check } from '../../../design-system/icons';
import { colors, Text } from '../../../design-system';

export function CardStatusBar({ active }: { active: boolean }) {
  return (
    <Wrapper active={active}>
      <ActiveWrapper>
        <BellGradient />
        <StyledText>{active ? 'Active' : 'Not Active'}</StyledText>
      </ActiveWrapper>
      <ConnectedWrapper>
        <StyledText>Connected</StyledText>
        <Check />
      </ConnectedWrapper>
    </Wrapper>
  );
}

const StyledText = styled(Text)`
  display: inline-block;

  margin: 0 6px;
`;

const SideElementBase = styled.div`
  display: flex;
  align-items: center;
`;

const ActiveWrapper = styled(SideElementBase)`
  ${StyledText} {
    color: red;
  }
`;

const ConnectedWrapper = styled(SideElementBase)`
  ${StyledText} {
    color: ${colors.success};
  }
`;

const Wrapper = styled.div<{ active: boolean }>`
  display: flex;
  justify-content: space-between;

  ${({ active }) => {
    return (
      !active &&
      `
      ${StyledText},
      svg {
        color: ${colors.B40} !important;
      }
    `
    );
  }}
  svg {
    width: 16px;
  }
`;
