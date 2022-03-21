import styled from '@emotion/styled';
import { BoltGradient, CheckCircle } from '../../../design-system/icons';
import { colors, Text } from '../../../design-system';

export function CardStatusBar({ active }: { active: boolean }) {
  return (
    <Wrapper active={active}>
      <ActiveWrapper active={active}>
        <BoltGradient />
        <StyledText>{active ? 'Active' : 'Not Active'}</StyledText>
      </ActiveWrapper>
      <ConnectedWrapper active={active}>
        <StyledText>Connected</StyledText>
        <StyledCheckCircle active={active} />
      </ConnectedWrapper>
    </Wrapper>
  );
}

const StyledCheckCircle = styled(CheckCircle)<{ active: boolean }>`
  fill: ${({ active }) => (active ? colors.success : colors.B40)};
`;

const StyledText = styled(Text)`
  display: inline-block;

  margin: 0 6px;
`;

const SideElementBase = styled.div`
  display: flex;
  align-items: center;
`;

const ActiveWrapper = styled(SideElementBase)<{ active: boolean }>`
  ${({ active }) => {
    return !active
      ? `
      ${StyledText},
      svg {
        color: ${colors.B40};
        fill: ${colors.B40};
      }  
    `
      : `${StyledText},
      svg {
        color: red;
        fill: url(#paint0_linear_1062_464);
      }`;
  }}
`;

const ConnectedWrapper = styled(SideElementBase)<{ active: boolean }>`
  ${({ active }) => {
    return !active
      ? `
      ${StyledText},
      svg {
        fill: ${colors.B40};
        color: ${colors.B40};
      }  
    `
      : `${StyledText},
      svg {
        color: ${colors.success};
        fill: ${colors.success};
      }`;
  }}
`;

const Wrapper = styled.div<{ active: boolean }>`
  display: flex;
  justify-content: space-between;

  svg {
    width: 16px;
  }
`;
