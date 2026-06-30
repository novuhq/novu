import { prepareBooleanStringFeatureFlag } from '@novu/shared';
import { useFlags } from 'launchdarkly-react-client-sdk';
import { LAUNCH_DARKLY_CLIENT_SIDE_ID } from '../../config';
import { useSubscription } from '../../ee/billing/hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';
import {
  buildMigrationGuideUrl,
  DEFAULT_LEGACY_DASHBOARD_DEPRECATION_DATE,
  formatDeprecationDateLabel,
  getDaysUntilDeprecation,
  getDeprecationTimePhrase,
  LEGACY_DASHBOARD_DEPRECATION_DATE_FLAG,
  LEGACY_DASHBOARD_DEPRECATION_NOTICE_ENABLED_DEFAULT,
  LEGACY_DASHBOARD_DEPRECATION_NOTICE_ENABLED_FLAG,
  parseDeprecationDate,
} from './deprecation-notice';

type MigrationNoticeUtmMedium = 'deprecation_banner' | 'deprecation_modal';

function isLaunchDarklyEnabled() {
  return !!LAUNCH_DARKLY_CLIENT_SIDE_ID;
}

function readBooleanFlag(key: string, defaultValue: boolean, flags: Record<string, unknown>): boolean {
  if (!isLaunchDarklyEnabled()) {
    return prepareBooleanStringFeatureFlag(window._env_[key] || process.env[key], defaultValue);
  }

  const flagValue = flags[key];

  if (typeof flagValue === 'boolean') {
    return flagValue;
  }

  return defaultValue;
}

function readStringFlag(key: string, defaultValue: string, flags: Record<string, unknown>): string {
  if (!isLaunchDarklyEnabled()) {
    return window._env_[key] || process.env[key] || defaultValue;
  }

  const flagValue = flags[key];

  if (typeof flagValue === 'string' && flagValue.length > 0) {
    return flagValue;
  }

  return defaultValue;
}

export function useLegacyDashboardMigrationNotice(utmMedium: MigrationNoticeUtmMedium) {
  const flags = useFlags();
  const { apiServiceLevel, isLoading } = useSubscription();
  const { currentOrganization } = useAuth();

  const isEnabled = readBooleanFlag(
    LEGACY_DASHBOARD_DEPRECATION_NOTICE_ENABLED_FLAG,
    LEGACY_DASHBOARD_DEPRECATION_NOTICE_ENABLED_DEFAULT,
    flags
  );
  const deprecationDateString = readStringFlag(
    LEGACY_DASHBOARD_DEPRECATION_DATE_FLAG,
    DEFAULT_LEGACY_DASHBOARD_DEPRECATION_DATE,
    flags
  );

  const deprecationDate = parseDeprecationDate(deprecationDateString);
  const daysLeft = getDaysUntilDeprecation(deprecationDate);
  const timePhrase = getDeprecationTimePhrase(daysLeft);
  const deprecationDateLabel = formatDeprecationDateLabel(deprecationDate);
  const migrationGuideUrl = buildMigrationGuideUrl(apiServiceLevel, currentOrganization, utmMedium);

  return {
    isEnabled,
    isLoading,
    daysLeft,
    timePhrase,
    deprecationDateLabel,
    migrationGuideUrl,
  };
}
