import { Badge } from '@/components/primitives/badge';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { Protect } from '@/utils/protect';
import { buildRoute, ROUTES } from '@/utils/routes';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum, GetSubscriptionDto, PermissionsEnum } from '@novu/shared';
import { ReactNode } from 'react';
import {
  RiBarChartBoxLine,
  RiDatabase2Line,
  RiDiscussLine,
  RiGroup2Line,
  RiKey2Line,
  RiLayout5Line,
  RiLineChartLine,
  RiRouteFill,
  RiSettings4Line,
  RiSignalTowerLine,
  RiStore3Line,
  RiTranslate2,
  RiUserAddLine,
} from 'react-icons/ri';
import { IS_ENTERPRISE, IS_SELF_HOSTED } from '../../config';
import { useFetchSubscription } from '../../hooks/use-fetch-subscription';
import { ChangelogStack } from './changelog-cards';
import { EnvironmentDropdown } from './environment-dropdown';
import { FreeTrialCard } from './free-trial-card';
import { HomeMenuItem } from './getting-started-menu-item';
import { NavigationLink } from './navigation-link';
import { OrganizationDropdown } from './organization-dropdown';
import { UsageCard } from './usage-card';

const NavigationGroup = ({ children, label }: { children: ReactNode; label?: string }) => {
  return (
    <div className="flex flex-col last:mt-auto">
      {!!label && <span className="text-foreground-400 px-2 py-1 text-sm">{label}</span>}
      {children}
    </div>
  );
};

type BottomNavigationProps = {
  isTrialActive?: boolean;
  isFreeTier?: boolean;
  isLoadingSubscription: boolean;
  subscription?: GetSubscriptionDto | undefined;
  daysLeft?: number;
};

const BottomSection = ({
  isTrialActive,
  isFreeTier,
  isLoadingSubscription,
  subscription,
  daysLeft,
}: BottomNavigationProps) => {
  if (IS_SELF_HOSTED) {
    return (
      <div className="relative mt-auto gap-8 pt-4">
        <HomeMenuItem />
      </div>
    );
  }

  return (
    <div className="relative mt-auto gap-8 pt-4">
      {!isTrialActive && !isLoadingSubscription && <ChangelogStack />}
      {isTrialActive && !isLoadingSubscription && daysLeft !== undefined && (
        <FreeTrialCard subscription={subscription} daysLeft={daysLeft} />
      )}

      {!isTrialActive && isFreeTier && !isLoadingSubscription && <UsageCard subscription={subscription} />}
      <NavigationGroup>
        <NavigationLink to={ROUTES.SETTINGS_TEAM}>
          <RiUserAddLine className="size-4" />
          <span>Invite teammates</span>
        </NavigationLink>
        <HomeMenuItem />
      </NavigationGroup>
    </div>
  );
};

export const SideNavigation = () => {
  const { subscription, daysLeft, isLoading: isLoadingSubscription } = useFetchSubscription();
  const isTrialActive = subscription?.trial.isActive;
  const isFreeTier = subscription?.apiServiceLevel === ApiServiceLevelEnum.FREE;
  const isWebhooksManagementEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WEBHOOKS_MANAGEMENT_ENABLED);
  const isTopicsPageActive = useFeatureFlag(FeatureFlagsKeysEnum.IS_TOPICS_PAGE_ACTIVE, false);
  const isHttpLogsPageEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HTTP_LOGS_PAGE_ENABLED, false);
  const isTranslationEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TRANSLATION_ENABLED, false);
  const isAnalyticsPageEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ANALYTICS_PAGE_ENABLED, false);

  const { currentEnvironment, environments, switchEnvironment } = useEnvironment();

  const onEnvironmentChange = (value: string) => {
    const environment = environments?.find((env) => env.name === value);
    switchEnvironment(environment?.slug);
  };

  return (
    <aside className="bg-neutral-alpha-50 relative flex h-full w-[275px] flex-shrink-0 flex-col">
      <SidebarContent className="h-full">
        <OrganizationDropdown />
        <EnvironmentDropdown
          currentEnvironment={currentEnvironment}
          data={environments}
          onChange={onEnvironmentChange}
        />
        <nav className="flex h-full flex-1 flex-col overflow-auto">
          <div className="flex flex-col gap-4">
            <NavigationGroup>
              <Protect permission={PermissionsEnum.WORKFLOW_READ}>
                <NavigationLink to={buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment?.slug ?? '' })}>
                  <RiRouteFill className="size-4" />
                  <span>Workflows</span>
                </NavigationLink>
              </Protect>

              <Protect permission={PermissionsEnum.WORKFLOW_READ}>
                <NavigationLink to={buildRoute(ROUTES.LAYOUTS, { environmentSlug: currentEnvironment?.slug ?? '' })}>
                  <RiLayout5Line className="size-4" />
                  <span>Email Layouts</span>
                </NavigationLink>
              </Protect>

              {isTranslationEnabled && (
                <NavigationLink
                  to={buildRoute(ROUTES.TRANSLATIONS, { environmentSlug: currentEnvironment?.slug ?? '' })}
                >
                  <RiTranslate2 className="size-4" />
                  <span>
                    Translations{' '}
                    <Badge variant="lighter" className="text-xs">
                      BETA
                    </Badge>
                  </span>
                </NavigationLink>
              )}
            </NavigationGroup>
            <NavigationGroup label="Data">
              <Protect permission={PermissionsEnum.SUBSCRIBER_READ}>
                <NavigationLink
                  to={buildRoute(ROUTES.SUBSCRIBERS, { environmentSlug: currentEnvironment?.slug ?? '' })}
                >
                  <RiGroup2Line className="size-4" />
                  <span>Subscribers</span>
                </NavigationLink>
              </Protect>
              {isTopicsPageActive && (
                <Protect permission={PermissionsEnum.TOPIC_READ}>
                  <NavigationLink to={buildRoute(ROUTES.TOPICS, { environmentSlug: currentEnvironment?.slug ?? '' })}>
                    <RiDiscussLine className="size-4" />
                    <span>Topics</span>
                  </NavigationLink>
                </Protect>
              )}
            </NavigationGroup>
            <Protect permission={PermissionsEnum.NOTIFICATION_READ}>
              <NavigationGroup label="Monitor">
                <Protect permission={PermissionsEnum.NOTIFICATION_READ}>
                  <NavigationLink
                    to={buildRoute(isHttpLogsPageEnabled ? ROUTES.ACTIVITY_WORKFLOW_RUNS : ROUTES.ACTIVITY_FEED, {
                      environmentSlug: currentEnvironment?.slug ?? '',
                    })}
                  >
                    <RiBarChartBoxLine className="size-4" />
                    <span>Activity Feed</span>
                  </NavigationLink>
                </Protect>
                {isAnalyticsPageEnabled && (
                  <Protect permission={PermissionsEnum.NOTIFICATION_READ}>
                    <NavigationLink
                      to={buildRoute(ROUTES.ANALYTICS, { environmentSlug: currentEnvironment?.slug ?? '' })}
                    >
                      <RiLineChartLine className="size-4" />
                      <span>
                        Analytics{' '}
                        <Badge variant="lighter" className="text-xs">
                          BETA
                        </Badge>
                      </span>
                    </NavigationLink>
                  </Protect>
                )}
              </NavigationGroup>
            </Protect>
            <Protect
              condition={(has) =>
                has({ permission: PermissionsEnum.API_KEY_READ }) ||
                has({ permission: PermissionsEnum.INTEGRATION_READ }) ||
                has({ permission: PermissionsEnum.WEBHOOK_READ }) ||
                has({ permission: PermissionsEnum.WEBHOOK_WRITE })
              }
            >
              <NavigationGroup label="Developer">
                <Protect permission={PermissionsEnum.API_KEY_READ}>
                  <NavigationLink to={buildRoute(ROUTES.API_KEYS, { environmentSlug: currentEnvironment?.slug ?? '' })}>
                    <RiKey2Line className="size-4" />
                    <span>API Keys</span>
                  </NavigationLink>
                </Protect>
                {isWebhooksManagementEnabled && (
                  <Protect
                    condition={(has) =>
                      has({ permission: PermissionsEnum.WEBHOOK_READ }) ||
                      has({ permission: PermissionsEnum.WEBHOOK_WRITE })
                    }
                  >
                    <NavigationLink
                      to={buildRoute(ROUTES.WEBHOOKS, { environmentSlug: currentEnvironment?.slug ?? '' })}
                    >
                      <RiSignalTowerLine className="size-4" />
                      <span className="flex items-center gap-2">Webhooks</span>
                    </NavigationLink>
                  </Protect>
                )}
                <NavigationLink
                  to={buildRoute(ROUTES.ENVIRONMENTS, { environmentSlug: currentEnvironment?.slug ?? '' })}
                >
                  <RiDatabase2Line className="size-4" />
                  <span>Environments</span>
                </NavigationLink>
                <Protect permission={PermissionsEnum.INTEGRATION_READ}>
                  <NavigationLink
                    to={buildRoute(ROUTES.INTEGRATIONS, { environmentSlug: currentEnvironment?.slug ?? '' })}
                  >
                    <RiStore3Line className="size-4" />
                    <span>Integration Store</span>
                  </NavigationLink>
                </Protect>
              </NavigationGroup>
            </Protect>
            {!IS_SELF_HOSTED || IS_ENTERPRISE ? (
              <NavigationGroup label="Application">
                <NavigationLink to={ROUTES.SETTINGS}>
                  <RiSettings4Line className="size-4" />
                  <span>Settings</span>
                </NavigationLink>
              </NavigationGroup>
            ) : null}
          </div>

          <BottomSection
            isTrialActive={isTrialActive}
            isFreeTier={isFreeTier}
            isLoadingSubscription={isLoadingSubscription}
            subscription={subscription}
            daysLeft={daysLeft}
          />
        </nav>
      </SidebarContent>
    </aside>
  );
};
