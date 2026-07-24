import { Show } from '@clerk/react';
import type { CheckAuthorizationWithCustomPermissions, ShowWhenCondition } from '@clerk/shared/types';
import {
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
  MemberRoleEnum,
  PermissionsEnum,
} from '@novu/shared';
import { ReactNode } from 'react';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';

export type ProtectProps = {
  children: ReactNode;
  permission?: PermissionsEnum;
  role?: MemberRoleEnum;
  condition?: (has: CheckAuthorizationWithCustomPermissions) => boolean;
  fallback?: ReactNode;
};

function getWhenProp({ permission, role, condition }: ProtectProps): ShowWhenCondition {
  if (permission) {
    return { permission };
  }

  if (role) {
    return { role };
  }

  if (condition) {
    return condition;
  }

  return 'signed-in';
}

export const Protect = (props: ProtectProps) => {
  const { subscription } = useFetchSubscription();
  const isRbacFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_RBAC_ENABLED);
  const isRbacFeatureEnabled =
    getFeatureForTierAsBoolean(
      FeatureNameEnum.ACCOUNT_ROLE_BASED_ACCESS_CONTROL_BOOLEAN,
      subscription?.apiServiceLevel ?? ApiServiceLevelEnum.FREE
    ) && isRbacFlagEnabled;

  if (!isRbacFeatureEnabled) {
    return props.children;
  }

  return (
    <Show when={getWhenProp(props)} fallback={props.fallback}>
      {props.children}
    </Show>
  );
};
