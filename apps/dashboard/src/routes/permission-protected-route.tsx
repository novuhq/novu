import { useAuth } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReactNode, useEffect, useMemo } from 'react';
import {
  getFeatureForTierAsBoolean,
  FeatureNameEnum,
  ApiServiceLevelEnum,
  PermissionsEnum,
  FeatureFlagsKeysEnum,
} from '@novu/shared';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

interface PermissionProtectedRouteProps {
  children: ReactNode;
  permission?: PermissionsEnum;
  condition?: (has: (params: { permission: string } | { role: string }) => boolean) => boolean;
  isDrawerRoute?: boolean;
}

export function PermissionProtectedRoute({
  children,
  permission,
  condition,
  isDrawerRoute,
}: PermissionProtectedRouteProps) {
  const { isLoaded, has } = useAuth();
  const { subscription } = useFetchSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const isRbacFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_RBAC_ENABLED);

  const isRbacFeatureEnabled =
    !subscription?.trial.isActive &&
    getFeatureForTierAsBoolean(
      FeatureNameEnum.ACCOUNT_ROLE_BASED_ACCESS_CONTROL_BOOLEAN,
      subscription?.apiServiceLevel ?? ApiServiceLevelEnum.FREE
    ) &&
    isRbacFlagEnabled;

  const parentUrl = isDrawerRoute ? location.pathname.substring(0, location.pathname.lastIndexOf('/')) : '';

  const hasAccess = useMemo(() => {
    if (!isLoaded) return true;

    const hasPermission = permission ? has?.({ permission }) : true;
    const meetsCondition = condition ? condition(has) : true;

    return hasPermission && meetsCondition;
  }, [isLoaded, has, permission, condition]);

  useEffect(() => {
    if (isLoaded && !hasAccess && isDrawerRoute) {
      showErrorToast("You don't have permission to access this resource", 'Unauthorized');
      navigate(parentUrl);
    }
  }, [isLoaded, hasAccess, isDrawerRoute, navigate, parentUrl]);

  if (!isRbacFeatureEnabled) {
    return children;
  }

  if (isLoaded && !hasAccess && !isDrawerRoute) {
    return (
      <>
        <PageMeta title="Unauthorized" />
        <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Unauthorized</h1>}>
          <div className="flex flex-col items-center justify-center p-6">
            <p className="text-foreground-950 text-lg">You don't have permission to access this resource</p>
          </div>
        </DashboardLayout>
      </>
    );
  }

  return <>{children}</>;
}
