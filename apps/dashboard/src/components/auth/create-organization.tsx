import { useClerk } from '@clerk/clerk-react';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OrganizationPicker } from '@/components/auth/organization-picker';
import { RegionSelector } from '@/context/region';
import { buildAfterSignOutUrl } from '@/utils/cross-product-sign-out';
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

interface FormContainerProps {
  children: React.ReactNode;
}

interface IllustrationProps {
  src: string;
  alt: string;
  className?: string;
}

function FormContainer({ children }: FormContainerProps) {
  return (
    <div className="flex w-full items-center p-6 md:min-w-[564px] md:max-w-[564px] md:p-[60px]">
      <div className="flex w-full flex-col gap-[4px]">{children}</div>
    </div>
  );
}

function OrganizationForm() {
  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const [searchParams] = useSearchParams();
  const clerk = useClerk();

  // Hostname-aware: defaults to Connect when running on the Connect host, otherwise reads
  // the explicit `?appId=` param (Platform → Connect handoff case).
  const appId = useMemo(() => resolveOnboardingAppId(searchParams), [searchParams]);

  // Only forward `?appId=` when it was set explicitly on the URL (Platform → Connect
  // cross-origin handoff). When the user is already on the Connect hostname, hostname
  // detection alone is enough — onboarding URLs stay clean.
  const explicitAppId = useMemo(() => getOnboardingAppId(searchParams), [searchParams]);
  const afterCreateUrl = withAppId(getPostOrgCreateRoute(appId, isAgentsEnabled), explicitAppId);
  const afterSelectUrl = withAppId(ROUTES.ENV, explicitAppId);

  const handleSignOut = useCallback(async () => {
    await clerk.signOut({ redirectUrl: buildAfterSignOutUrl() });
  }, [clerk]);

  return (
    <div className="relative">
      <div className="absolute -top-14 left-4 z-20">
        <RegionSelector />
      </div>

      <OrganizationPicker
        afterCreateOrganizationUrl={afterCreateUrl}
        afterSelectOrganizationUrl={afterSelectUrl}
        onSignOut={handleSignOut}
      />
    </div>
  );
}

function OrganizationFormSection() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <FormContainer>
        <OrganizationForm />
      </FormContainer>
    </div>
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

function MainContent() {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <OrganizationFormSection />
      <IllustrationSection />
    </div>
  );
}

function PageHeader() {
  return <UsecasePlaygroundHeader {...HEADER_CONFIG} />;
}

function PageContent() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden pb-3">
      <PageHeader />
      <MainContent />
    </div>
  );
}

/**
 * Manual org-list / create-organization UI. Host-aware: the embedded `<OrganizationPicker/>`
 * filters memberships to the current product (Platform or Connect) via `publicMetadata.productType`.
 *
 * On the Connect host this is rendered as a fallback by `AutoCreateConnectOrganization` when the
 * resolver returns `manualCreate` (no Connect membership + no provisioning intent — typical
 * after the user left or deleted their last Connect org). Page-level routing in
 * `pages/organization-list.tsx` keeps Connect arrivals going through AutoCreate first so silent
 * switch / first-time provisioning still happen without flashing this UI.
 */
export default function OrganizationCreate() {
  return (
    <div className="flex w-full flex-1 flex-row items-center justify-center">
      <AuthCard>
        <PageContent />
      </AuthCard>
    </div>
  );
}
