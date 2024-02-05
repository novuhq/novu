import styled from '@emotion/styled';
import { colors } from '@novu/design-system';

export const StepDescription = styled.div`
  display: inline;
  color: ${colors.B60};
`;

export function Link({ href, text }: { href: string; text: string }) {
  return (
    <StyledLink href={href} target="_blank" rel="noreferrer noopener">
      {text}
    </StyledLink>
  );
}
export const StyledLink = styled.a`
  color: ${colors.gradientEnd};
`;
