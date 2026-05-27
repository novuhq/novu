import { useAuth, useOrganization, useUser } from '@clerk/react';
import { resolveMfaEnforcementState } from '@novu/shared';
import { ReactNode, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EE_AUTH_PROVIDER, IS_ENTERPRISE, IS_SELF_HOSTED } from '@/config';
import { isPublicAuthPath } from '@/utils/auth-routes';
import { ROUTES } from '@/utils/routes';

const MFA_SETUP_ROUTE = ROUTES.SETTINGS_ACCOUNT;

function isMfaSetupPath(pathname: string): boolean {
  return pathname === MFA_SETUP_ROUTE || pathname.startsWith(`${MFA_SETUP_ROUTE}/`);
}

export function MfaEnforcementProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoaded: isAuthLoaded, sessionClaims } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const { isLoaded: isOrganizationLoaded, organization } = useOrganization();

  const isEnforcementEnabled = IS_ENTERPRISE && !IS_SELF_HOSTED && EE_AUTH_PROVIDER === 'clerk';

  const enforcementState = useMemo(() => {
    if (!isEnforcementEnabled) {
      return { isBlocked: false };
    }

    return resolveMfaEnforcementState({
      sessionClaims: sessionClaims as Record<string, unknown> | undefined,
      organizationPublicMetadata: organization?.publicMetadata,
      userTwoFactorEnabled: user?.twoFactorEnabled,
    });
  }, [isEnforcementEnabled, sessionClaims, organization?.publicMetadata, user?.twoFactorEnabled]);

  const isReady = isAuthLoaded && isUserLoaded && isOrganizationLoaded;
  const pathname = location.pathname;
  const canAccessCurrentRoute = isPublicAuthPath(pathname) || isMfaSetupPath(pathname);
  const shouldBlockChildren = isEnforcementEnabled && isReady && enforcementState.isBlocked && !canAccessCurrentRoute;

  useEffect(() => {
    if (!shouldBlockChildren) {
      return;
    }

    if (!isMfaSetupPath(pathname)) {
      void navigate(MFA_SETUP_ROUTE, { replace: true });
    }
  }, [shouldBlockChildren, pathname, navigate]);

  if (!isReady && isEnforcementEnabled) {
    return null;
  }

  if (shouldBlockChildren) {
    return null;
  }

  return children;
}
