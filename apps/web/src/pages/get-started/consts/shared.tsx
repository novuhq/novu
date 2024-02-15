import styled from '@emotion/styled';
import { colors } from '@novu/design-system';

export const StepText = styled.p`
  display: inline;
  color: ${colors.B60};
`;

export const StepDescription = styled.div`
  line-height: 1.25rem;
  margin: 0;
`;

export function Link({ children, ...linkProps }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <StyledLink {...linkProps} target="_blank" rel="noreferrer noopener">
      {children}
    </StyledLink>
  );
}

export const StyledLink = styled.a`
  color: ${colors.gradientEnd};
`;
