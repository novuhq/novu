import { OrganizationList as OrganizationListForm, useOrganization } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useTelemetry } from '../../hooks/use-telemetry';
import { clerkSignupAppearance } from '../../utils/clerk-appearance';
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
  showStepper: true,
  currentStep: 1,
  totalSteps: 4,
} as const;

const ORGANIZATION_FORM_CONFIG = {
  hidePersonal: true,
  skipInvitationScreen: true,
  afterSelectOrganizationUrl: ROUTES.ENV,
  afterCreateOrganizationUrl: ROUTES.INBOX_USECASE,
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
    <div className="flex min-w-[564px] max-w-[564px] items-center p-[60px]">
      <div className="flex flex-col gap-[4px]">{children}</div>
    </div>
  );
}

function OrganizationForm() {
  return <OrganizationListForm appearance={FORM_APPEARANCE} {...ORGANIZATION_FORM_CONFIG} />;
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
    <div className="flex flex-1 items-center justify-center">
      <Illustration {...ILLUSTRATION_CONFIG} />
    </div>
  );
}

function MainContent() {
  return (
    <div className="flex flex-1">
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
  const track = useTelemetry();

  useEffect(() => {
    // Track when an organization is successfully created/selected
    if (organization) {
      track(TelemetryEvent.CREATE_ORGANIZATION_FORM_SUBMITTED, {
        location: 'web',
        organizationId: organization.id,
        organizationName: organization.name,
      });
    }
  }, [organization, track]);

  return (
    <div className="flex w-full flex-1 flex-row items-center justify-center">
      <AuthCard>
        <PageContent />
      </AuthCard>
    </div>
  );
}
