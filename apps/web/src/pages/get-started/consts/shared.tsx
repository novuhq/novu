import styled from '@emotion/styled';
import { colors } from '@novu/design-system';
import { useSegment } from '../../../components/providers/SegmentProvider';

export const StepText = styled.p`
  display: inline;
  color: ${colors.B60};
`;

export const StepDescription = styled.div`
  margin: 0;
`;

export function GetStartedLink({ children, ...linkProps }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <Link {...linkProps}>
      <StyledLink>{children}</StyledLink>
    </Link>
  );
}

export const StyledLink = styled.a`
  color: ${colors.gradientEnd};
`;

export function Link({ children, ...linkProps }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const segment = useSegment();

  const handleOnClick = () => {
    segment.track('Link Click - [Get Started]', { href: linkProps.href });
  };

  return (
    <a onClick={handleOnClick} {...linkProps} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  );
}
