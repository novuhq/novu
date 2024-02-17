import styled from '@emotion/styled';
import { colors } from '@novu/design-system';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '../../../constants/routes.enum';

export const StepText = styled.p`
  display: inline;
  color: ${colors.B60};
`;

export const StepDescription = styled.div`
  margin: 0;
`;

export function Link({ route, children }: { route: ROUTES; children: string }) {
  const navigate = useNavigate();

  return (
    <StyledLink
      onClick={() => {
        navigate(route);
      }}
    >
      {children}
    </StyledLink>
  );
}

export function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: '520px',
        backgroundColor: '#525266',
        display: 'flex',
        borderRadius: '2%',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {children}
    </div>
  );
}

export const StyledLink = styled.a`
  color: ${colors.gradientEnd};
`;
