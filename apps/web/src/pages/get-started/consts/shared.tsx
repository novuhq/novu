import styled from '@emotion/styled';
import { colors } from '@novu/design-system';

export const StepText = styled.div`
  display: inline;
  color: ${colors.B60};
`;

export const StepDescription = styled.p`
  margin: 0;
`;

export function Link({ href, children }: { href: string; children: string }) {
  return (
    <StyledLink href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </StyledLink>
  );
}
export const StyledLink = styled.a`
  color: ${colors.gradientEnd};
`;
