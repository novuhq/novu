import { OrganizationList as OrganizationListForm, useOrganization } from '@clerk/clerk-react';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RegionSelector, useRegion } from '@/context/region';
import { useFeatureFlag } from '../../hooks/use-feature-flag';
import { useTelemetry } from '../../hooks/use-telemetry';
import { clerkSignupAppearance } from '../../utils/clerk-appearance';
import { getOnboardingAppId, withAppId } from '../../utils/onboarding-redirect';
import { ROUTES } from '../../utils/routes';
import { TelemetryEvent } from '../../utils/telemetry';
import { UsecasePlaygroundHeader } from '../usecase-playground-header';
import { AuthCard } from './auth-card';

// Constants
const HEADER_CONFIG = {
  title: 'Create an organization',
  description: 'Create an organization to get started',
  showSkipButton: false,
  showBackButton: false,
  showStepper: false,
} as const;

const ORGANIZATION_FORM_BASE_CONFIG = {
  hidePersonal: true,
  skipInvitationScreen: true,
} as const;

const FORM_APPEARANCE = {
  elements: {
    ...clerkSignupAppearance.elements,
    cardBox: { boxShadow: 'none' },
    card: { paddingTop: 0, padding: 0 },
  },
} as const;

const ILLUSTRATION_CONFIG = {
  src: '/images/auth/ui-org.svg',
  alt: 'Novu dashboard overview',
  className: 'opacity-70',
} as const;

// Types
interface FormContainerProps {
  children: React.ReactNode;
}

interface IllustrationProps {
  src: string;
  alt: string;
  className?: string;
}

// Small Components
function FormContainer({ children }: FormContainerProps) {
  return (
    <div className="flex w-full items-center p-6 md:min-w-[564px] md:max-w-[564px] md:p-[60px]">
      <div className="flex w-full flex-col gap-[4px]">{children}</div>
    </div>
  );
}

function OrganizationForm() {
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const [searchParams] = useSearchParams();
  const appId = useMemo(() => getOnboardingAppId(searchParams), [searchParams]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const nameInput = document.querySelector('input[name="name"]');
      const isOnFormPage = !!nameInput;

      if (isOnFormPage !== showRegionSelector) {
        setShowRegionSelector(isOnFormPage);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [showRegionSelector]);

  const afterCreateUrl = withAppId(isAgentsEnabled ? ROUTES.USECASE_SELECT : ROUTES.INBOX_USECASE, appId);
  const afterSelectUrl = withAppId(ROUTES.ENV, appId);

  return (
    <div className="relative">
      {showRegionSelector && (
        <div className="absolute -top-14 left-4 z-20">
          <RegionSelector />
        </div>
      )}

      <OrganizationListForm
        appearance={FORM_APPEARANCE}
        {...ORGANIZATION_FORM_BASE_CONFIG}
        afterCreateOrganizationUrl={afterCreateUrl}
        afterSelectOrganizationUrl={afterSelectUrl}
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

export default function OrganizationCreate() {
  const { organization } = useOrganization();
  const { selectedRegion } = useRegion();
  const track = useTelemetry();
  const hasTrackedRef = useRef(false);
  const trackedOrgIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (organization?.id && !hasTrackedRef.current && trackedOrgIdRef.current !== organization.id) {
      hasTrackedRef.current = true;
      trackedOrgIdRef.current = organization.id;

      track(TelemetryEvent.CREATE_ORGANIZATION_FORM_SUBMITTED, {
        location: 'web',
        organizationId: organization.id,
        organizationName: organization.name,
        region: selectedRegion,
      });
    }
  }, [organization?.id, organization?.name, selectedRegion, track]);

  return (
    <div className="flex w-full flex-1 flex-row items-center justify-center">
      <AuthCard>
        <PageContent />
      </AuthCard>
    </div>
  );
}
