import styled from '@emotion/styled';
import { BoltGradient, colors, Text } from '@novu/design-system';

export function CardStatusBar({ active }: { active: boolean }) {
  const iconProps = active ? { fill: colors.success } : {};

  return (
    <Wrapper>
      <ActiveWrapper active={active}>
        <BoltGradient {...iconProps} />
        <StyledText data-test-id="card-status-bar-active">{active ? 'Active' : 'Disabled'}</StyledText>
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
      {
       color: ${colors.B40};
        svg {
          fill: ${colors.B40};
        }  
      }
    `
      : `${StyledText},
      {
      background: ${colors.success};
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
        svg {
          fill: url(#paint0_linear_1062_464);
        }
      }
      `;
  }}
`;

const Wrapper = styled.div`
  display: flex;
  justify-content: space-between;

  svg {
    width: 16px;
  }
`;
