import { useClerk } from '@clerk/react';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OrganizationPicker } from '@/components/auth/organization-picker';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { resolvePendingCliAuthReturnUrl } from '@/utils/cli-auth-pending';
import { buildAfterSignOutUrl } from '@/utils/cross-product-sign-out';
import { cn } from '@/utils/ui';
import { useFeatureFlag } from '../../hooks/use-feature-flag';
import {
  getOnboardingAppId,
  getPostOrgCreateRoute,
  resolveOnboardingAppId,
  withAppId,
} from '../../utils/onboarding-redirect';
import { ROUTES } from '../../utils/routes';
import { UsecasePlaygroundHeader } from '../usecase-playground-header';
import { AuthCard } from './auth-card';

const HEADER_CONFIG = {
  title: 'Create an organization',
  description: 'Create an organization to get started',
  showSkipButton: false,
  showBackButton: false,
  showStepper: false,
} as const;

const ILLUSTRATION_CONFIG = {
  src: '/images/auth/ui-org.svg',
  alt: 'Novu dashboard overview',
  className: 'opacity-70',
} as const;

interface IllustrationProps {
  src: string;
  alt: string;
  className?: string;
}

function OrganizationForm({ onResolvingChange }: { onResolvingChange: (isResolving: boolean) => void }) {
  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const [searchParams] = useSearchParams();
  const clerk = useClerk();

  const appId = useMemo(() => resolveOnboardingAppId(searchParams), [searchParams]);

  // Only forward `?appId=` when it was set explicitly — hostname detection covers the rest.
  const explicitAppId = useMemo(() => getOnboardingAppId(searchParams), [searchParams]);
  const pendingCliAuthReturnUrl = useMemo(() => resolvePendingCliAuthReturnUrl(), []);
  const afterCreateUrl =
    pendingCliAuthReturnUrl ?? withAppId(getPostOrgCreateRoute(appId, isAgentsEnabled), explicitAppId);
  const afterSelectUrl = pendingCliAuthReturnUrl ?? withAppId(ROUTES.ENV, explicitAppId);

  const handleSignOut = useCallback(async () => {
    const fallbackUrl = buildAfterSignOutUrl();

    try {
      await clerk.signOut({ redirectUrl: fallbackUrl });
    } catch (error) {
      console.error('Failed to sign out via Clerk', error);
      const message = error instanceof Error ? error.message : 'Please try again.';
      showErrorToast(`Unable to sign out. ${message}`, 'Sign out failed');
      // Safe fallback so the user isn't stranded on the org-picker if Clerk's redirect never runs.
      window.location.assign(fallbackUrl);
    }
  }, [clerk]);

  return (
    <OrganizationPicker
      afterCreateOrganizationUrl={afterCreateUrl}
      afterSelectOrganizationUrl={afterSelectUrl}
      onSignOut={handleSignOut}
      onResolvingChange={onResolvingChange}
    />
  );
}

function Illustration({ src, alt, className }: IllustrationProps) {
  return (
    <div className="w-full max-w-[564px]">
      <img src={src} alt={alt} className={className} />
    </div>
  );
}

function IllustrationSection() {
  return (
    <div className="hidden flex-1 items-center justify-center md:flex">
      <Illustration {...ILLUSTRATION_CONFIG} />
    </div>
  );
}

function PageHeader() {
  return <UsecasePlaygroundHeader {...HEADER_CONFIG} />;
}

function PageContent({ onShowChromeChange }: { onShowChromeChange: (showChrome: boolean) => void }) {
  const [showChrome, setShowChrome] = useState(false);

  const handleResolvingChange = useCallback(
    (isResolving: boolean) => {
      const nextShowChrome = !isResolving;
      setShowChrome(nextShowChrome);
      onShowChromeChange(nextShowChrome);
    },
    [onShowChromeChange]
  );

  return (
    <div className={cn('flex flex-1 flex-col', showChrome && 'overflow-hidden pb-3')}>
      {showChrome ? <PageHeader /> : null}
      <div className="flex flex-1 flex-col md:flex-row">
        <div className="flex flex-1 items-center justify-center">
          <div
            className={cn(
              'flex w-full items-center',
              showChrome && 'p-6 md:min-w-[564px] md:max-w-[564px] md:p-[60px]'
            )}
          >
            <div className={cn('flex w-full', showChrome ? 'flex-col gap-[4px]' : 'items-center justify-center')}>
              <OrganizationForm onResolvingChange={handleResolvingChange} />
            </div>
          </div>
        </div>
        {showChrome ? <IllustrationSection /> : null}
      </div>
    </div>
  );
}

// Embedded `<OrganizationPicker/>` filters memberships by `publicMetadata.productType`.
export default function OrganizationCreate() {
  const [showChrome, setShowChrome] = useState(false);

  return (
    <div className="flex w-full flex-1 flex-row items-center justify-center">
      <AuthCard
        className={cn(
          showChrome ? undefined : 'min-h-0 w-full max-w-none border-0 bg-transparent shadow-none md:min-h-0'
        )}
      >
        <PageContent onShowChromeChange={setShowChrome} />
      </AuthCard>
    </div>
  );
}
