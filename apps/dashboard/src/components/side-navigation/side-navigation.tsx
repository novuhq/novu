import { ApiServiceLevelEnum, FeatureFlagsKeysEnum, GetSubscriptionDto, PermissionsEnum } from '@novu/shared';
import { ReactNode, SVGProps } from 'react';
import {
  RiBarChartBoxLine,
  RiBuildingLine,
  RiCodeSSlashLine,
  RiDatabase2Line,
  RiDiscussLine,
  RiGroup2Line,
  RiKey2Line,
  RiLayout5Line,
  RiLineChartLine,
  RiRobot2Line,
  RiRouteFill,
  RiSettings4Line,
  RiSignalTowerLine,
  RiStore3Line,
  RiTranslate2,
  RiUserAddLine,
} from 'react-icons/ri';
import { Badge } from '@/components/primitives/badge';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { Protect } from '@/utils/protect';
import { buildRoute, ROUTES } from '@/utils/routes';
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

function MailAiLineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.7134 8.12811L20.4668 8.69379C20.2864 9.10792 19.7136 9.10792 19.5331 8.69379L19.2866 8.12811C18.8471 7.11947 18.0555 6.31641 17.0677 5.87708L16.308 5.53922C15.8973 5.35653 15.8973 4.75881 16.308 4.57612L17.0252 4.25714C18.0384 3.80651 18.8442 2.97373 19.2761 1.93083L19.5293 1.31953C19.7058 0.893489 20.2942 0.893489 20.4706 1.31953L20.7238 1.93083C21.1558 2.97373 21.9616 3.80651 22.9748 4.25714L23.6919 4.57612C24.1027 4.75881 24.1027 5.35653 23.6919 5.53922L22.9323 5.87708C21.9445 6.31641 21.1529 7.11947 20.7134 8.12811ZM2 4C2 3.44772 2.44772 3 3 3H14V5H4.5052L12 11.662L16.3981 7.75259L17.7269 9.24741L12 14.338L4 7.22684V19H20V11H22V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4Z" />
    </svg>
  );
}

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
  const isDomainsPageEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_DOMAINS_PAGE_ENABLED);
  const isHttpLogsPageEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HTTP_LOGS_PAGE_ENABLED, false);
  const isAnalyticsPageEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ANALYTICS_PAGE_ENABLED, false);
  const isVariablesPageEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_VARIABLES_PAGE_ENABLED, false);

  const { currentEnvironment, environments, switchEnvironment } = useEnvironment();

  const onEnvironmentChange = (value: string) => {
    const environment = environments?.find((env) => env.name === value);
    switchEnvironment(environment?.slug);
  };

  return (
    <aside className="bg-neutral-alpha-50 relative flex h-full w-[275px] shrink-0 flex-col">
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
                <NavigationLink
                  to={
                    currentEnvironment?.slug
                      ? buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment?.slug ?? '' })
                      : undefined
                  }
                >
                  <RiRouteFill className="size-4" />
                  <span>Workflows</span>
                </NavigationLink>
              </Protect>

              <NavigationLink
                to={
                  currentEnvironment?.slug
                    ? buildRoute(ROUTES.AGENTS, { environmentSlug: currentEnvironment?.slug ?? '' })
                    : undefined
                }
              >
                <RiRobot2Line className="size-4" />
                <span>Agents</span>
              </NavigationLink>
            </NavigationGroup>

            <NavigationGroup label="Content">
              <Protect permission={PermissionsEnum.WORKFLOW_READ}>
                <NavigationLink
                  to={
                    currentEnvironment?.slug
                      ? buildRoute(ROUTES.LAYOUTS, { environmentSlug: currentEnvironment?.slug ?? '' })
                      : undefined
                  }
                >
                  <RiLayout5Line className="size-4" />
                  <span>Email Layouts</span>
                </NavigationLink>
              </Protect>

              <NavigationLink
                to={
                  currentEnvironment?.slug
                    ? buildRoute(ROUTES.TRANSLATIONS, { environmentSlug: currentEnvironment?.slug ?? '' })
                    : undefined
                }
              >
                <RiTranslate2 className="size-4" />
                <span>Translations</span>
              </NavigationLink>
            </NavigationGroup>
            <NavigationGroup label="Data">
              <Protect permission={PermissionsEnum.SUBSCRIBER_READ}>
                <NavigationLink
                  to={
                    currentEnvironment?.slug
                      ? buildRoute(ROUTES.SUBSCRIBERS, { environmentSlug: currentEnvironment?.slug ?? '' })
                      : undefined
                  }
                >
                  <RiGroup2Line className="size-4" />
                  <span>Subscribers</span>
                </NavigationLink>
              </Protect>
              <Protect permission={PermissionsEnum.TOPIC_READ}>
                <NavigationLink
                  to={
                    currentEnvironment?.slug
                      ? buildRoute(ROUTES.TOPICS, { environmentSlug: currentEnvironment?.slug ?? '' })
                      : undefined
                  }
                >
                  <RiDiscussLine className="size-4" />
                  <span>Topics</span>
                </NavigationLink>
              </Protect>
              <Protect permission={PermissionsEnum.WORKFLOW_READ}>
                <NavigationLink
                  to={
                    currentEnvironment?.slug
                      ? buildRoute(ROUTES.CONTEXTS, { environmentSlug: currentEnvironment?.slug ?? '' })
                      : undefined
                  }
                >
                  <RiBuildingLine className="size-4" />
                  <span>
                    Contexts{' '}
                    <Badge variant="lighter" className="text-xs">
                      BETA
                    </Badge>
                  </span>
                </NavigationLink>
              </Protect>
            </NavigationGroup>
            <Protect permission={PermissionsEnum.NOTIFICATION_READ}>
              <NavigationGroup label="Monitor">
                <Protect permission={PermissionsEnum.NOTIFICATION_READ}>
                  <NavigationLink
                    to={
                      currentEnvironment?.slug
                        ? buildRoute(isHttpLogsPageEnabled ? ROUTES.ACTIVITY_WORKFLOW_RUNS : ROUTES.ACTIVITY_FEED, {
                            environmentSlug: currentEnvironment?.slug ?? '',
                          })
                        : undefined
                    }
                  >
                    <RiBarChartBoxLine className="size-4" />
                    <span>Activity Feed</span>
                  </NavigationLink>
                </Protect>
                {isAnalyticsPageEnabled && (
                  <Protect permission={PermissionsEnum.NOTIFICATION_READ}>
                    <NavigationLink
                      to={
                        currentEnvironment?.slug
                          ? buildRoute(ROUTES.ANALYTICS, { environmentSlug: currentEnvironment?.slug ?? '' })
                          : undefined
                      }
                    >
                      <RiLineChartLine className="size-4" />
                      <span>Usage</span>
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
                  <NavigationLink
                    to={
                      currentEnvironment?.slug
                        ? buildRoute(ROUTES.API_KEYS, { environmentSlug: currentEnvironment?.slug ?? '' })
                        : undefined
                    }
                  >
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
                      to={
                        currentEnvironment?.slug
                          ? buildRoute(ROUTES.WEBHOOKS, { environmentSlug: currentEnvironment?.slug ?? '' })
                          : undefined
                      }
                    >
                      <RiSignalTowerLine className="size-4" />
                      <span className="flex items-center gap-2">Webhooks</span>
                    </NavigationLink>
                  </Protect>
                )}
                {isDomainsPageEnabled && !IS_SELF_HOSTED && (
                  <NavigationLink
                    to={
                      currentEnvironment?.slug
                        ? buildRoute(ROUTES.DOMAINS, { environmentSlug: currentEnvironment?.slug ?? '' })
                        : undefined
                    }
                  >
                    <MailAiLineIcon className="size-4" />
                    <span>Inbound Email</span>
                  </NavigationLink>
                )}
                <NavigationLink
                  to={
                    currentEnvironment?.slug
                      ? buildRoute(ROUTES.ENVIRONMENTS, { environmentSlug: currentEnvironment?.slug ?? '' })
                      : undefined
                  }
                >
                  <RiDatabase2Line className="size-4" />
                  <span>Environments</span>
                </NavigationLink>
                {isVariablesPageEnabled && (
                  <NavigationLink
                    to={
                      currentEnvironment?.slug
                        ? buildRoute(ROUTES.VARIABLES, { environmentSlug: currentEnvironment?.slug ?? '' })
                        : undefined
                    }
                  >
                    <RiCodeSSlashLine className="size-4" />
                    <span>Variables</span>
                  </NavigationLink>
                )}
                <Protect permission={PermissionsEnum.INTEGRATION_READ}>
                  <NavigationLink
                    to={
                      currentEnvironment?.slug
                        ? buildRoute(ROUTES.INTEGRATIONS, { environmentSlug: currentEnvironment?.slug ?? '' })
                        : undefined
                    }
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
