import styled from '@emotion/styled';
import { BoltGradient } from '../../../design-system/icons';
import { colors, Text } from '../../../design-system';

export function CardStatusBar({ active }: { active: boolean }) {
  return (
    <Wrapper>
      <ActiveWrapper active={active}>
        <BoltGradient />
        <StyledText data-test-id="card-status-bar-active">{active ? 'Active' : 'Not Active'}</StyledText>
      </ActiveWrapper>
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

const Wrapper = styled.div`
  display: flex;
  justify-content: space-between;

  svg {
    width: 16px;
  }
`;
