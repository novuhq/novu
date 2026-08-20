import {
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
  MemberRoleEnum,
  PermissionsEnum,
} from '@novu/shared';
import { ReactNode, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { PageHeader, useIsPersistentLayout } from '@/context/page-header';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useHasPermission } from '@/hooks/use-has-permission';
import { AccessDeniedPage } from '@/pages/access-denied-page';

interface PermissionProtectedRouteProps {
  children: ReactNode;
  permission?: PermissionsEnum;
  condition?: (has: (params: { permission: PermissionsEnum } | { role: MemberRoleEnum }) => boolean) => boolean;
  isDrawerRoute?: boolean;
}

export function PermissionProtectedRoute({
  children,
  permission,
  condition,
  isDrawerRoute,
}: PermissionProtectedRouteProps) {
  const has = useHasPermission();
  const { subscription } = useFetchSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const isRbacFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_RBAC_ENABLED);
  const isPersistentLayout = useIsPersistentLayout();

  const isRbacFeatureEnabled =
    getFeatureForTierAsBoolean(
      FeatureNameEnum.ACCOUNT_ROLE_BASED_ACCESS_CONTROL_BOOLEAN,
      subscription?.apiServiceLevel ?? ApiServiceLevelEnum.FREE
    ) && isRbacFlagEnabled;

  const parentUrl = isDrawerRoute ? location.pathname.substring(0, location.pathname.lastIndexOf('/')) : '';

  const hasAccess = useMemo(() => {
    const hasPermission = permission ? has({ permission }) : true;
    const meetsCondition = condition ? condition(has) : true;

    return hasPermission && meetsCondition;
  }, [has, permission, condition]);

  useEffect(() => {
    if (!hasAccess && isDrawerRoute) {
      showErrorToast("You don't have permission to access this resource", 'Unauthorized');
      navigate(parentUrl);
    }
  }, [hasAccess, isDrawerRoute, navigate, parentUrl]);

  if (!isRbacFeatureEnabled) {
    return children;
  }

  if (!hasAccess && !isDrawerRoute) {
    const unauthorizedHeader = <h1 className="text-foreground-950">Unauthorized</h1>;

    return (
      <>
        <PageMeta title="Unauthorized" />
        {isPersistentLayout ? (
          <>
            <PageHeader>{unauthorizedHeader}</PageHeader>
            <AccessDeniedPage />
          </>
        ) : (
          <DashboardLayout headerStartItems={unauthorizedHeader}>
            <AccessDeniedPage />
          </DashboardLayout>
        )}
      </>
    );
  }

  return <>{children}</>;
}
