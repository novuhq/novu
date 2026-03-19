import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { RiArrowRightSLine, RiLoader4Line } from 'react-icons/ri';
import { Avatar, AvatarFallback } from '@/components/primitives/avatar';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { ROUTES } from '@/utils/routes';
import { useTelemetry } from '../../../hooks/use-telemetry';
import { TelemetryEvent } from '../../../utils/telemetry';
import { authClient } from '../client';
import { useOrganization } from '../index';

const ILLUSTRATION_CONFIG = {
  src: '/images/auth/ui-org.svg',
  alt: 'Novu dashboard overview',
  className: 'opacity-70',
} as const;

function getOrganizationInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

type Organization = {
  id: string;
  name: string;
  slug: string;
};

function OrganizationItem({
  organization,
  onSelect,
  isSelecting,
}: {
  organization: Organization;
  onSelect: (id: string) => void;
  isSelecting: boolean;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect(organization.id)}
      disabled={isSelecting}
      className="group flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-left transition-all hover:border-neutral-300 hover:shadow-sm disabled:opacity-50"
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary-base text-static-white text-sm font-medium">
          {getOrganizationInitials(organization.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground-950">{organization.name}</p>
      </div>
      {isSelecting ? (
        <RiLoader4Line className="size-5 shrink-0 animate-spin text-foreground-600" />
      ) : (
        <RiArrowRightSLine className="size-5 shrink-0 text-foreground-400 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </motion.button>
  );
}

function CreateOrganizationForm({ onSuccess }: { onSuccess: () => void }) {
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const orgNameId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: createError } = await authClient.organization.create({
        name: orgName,
        slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });

      if (createError) {
        throw new Error(createError.message || 'Failed to create organization');
      }

      if (data?.id) {
        await authClient.organization.setActive({
          organizationId: data.id,
        });
        onSuccess();
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor={orgNameId} className="mb-1.5 block text-xs font-medium text-foreground-700">
          Organization name
        </label>
        <Input
          id={orgNameId}
          value={orgName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrgName(e.target.value)}
          placeholder="My Organization"
          required
          disabled={isLoading}
          className="h-10"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={isLoading || !orgName.trim()}
        variant="primary"
        mode="gradient"
        className="w-full"
      >
        {isLoading ? 'Creating...' : 'Create organization'}
      </Button>
    </form>
  );
}

function OrganizationListContent({
  afterCreateOrganizationUrl,
  afterSelectOrganizationUrl,
}: {
  afterCreateOrganizationUrl?: string;
  afterSelectOrganizationUrl?: string;
}) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const { data } = await authClient.organization.list();
        setOrganizations(data || []);
      } catch (e: any) {
        console.error('Failed to load organizations:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganizations();
  }, []);

  const handleSelectOrganization = async (organizationId: string) => {
    setIsSelecting(true);
    try {
      await authClient.organization.setActive({
        organizationId,
      });
      window.location.href = afterSelectOrganizationUrl || ROUTES.ENV;
    } catch (e: any) {
      console.error('Failed to set active organization:', e);
      setIsSelecting(false);
    }
  };

  const handleCreateSuccess = () => {
    window.location.href = afterCreateOrganizationUrl || ROUTES.INBOX_USECASE;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RiLoader4Line className="size-6 animate-spin text-foreground-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {organizations.length > 0 && !showCreateForm && (
        <>
          <div className="space-y-3">
            <AnimatePresence>
              {organizations.map((org) => (
                <OrganizationItem
                  key={org.id}
                  organization={org}
                  onSelect={handleSelectOrganization}
                  isSelecting={isSelecting}
                />
              ))}
            </AnimatePresence>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-foreground-600">or</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => setShowCreateForm(true)}
            variant="secondary"
            mode="outline"
            className="w-full"
          >
            Create a new organization
          </Button>
        </>
      )}

      {(showCreateForm || organizations.length === 0) && (
        <>
          <CreateOrganizationForm onSuccess={handleCreateSuccess} />
          {organizations.length > 0 && showCreateForm && (
            <Button
              type="button"
              onClick={() => setShowCreateForm(false)}
              variant="secondary"
              mode="ghost"
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function FormContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-[564px] max-w-[564px] items-center p-[60px]">
      <div className="w-full space-y-6">{children}</div>
    </div>
  );
}

function Illustration({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className="w-full max-w-[564px]">
      <img src={src} alt={alt} className={className} />
    </div>
  );
}

function OrganizationFormSection({
  afterCreateOrganizationUrl,
  afterSelectOrganizationUrl,
}: {
  afterCreateOrganizationUrl?: string;
  afterSelectOrganizationUrl?: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <FormContainer>
        <OrganizationListContent
          afterCreateOrganizationUrl={afterCreateOrganizationUrl}
          afterSelectOrganizationUrl={afterSelectOrganizationUrl}
        />
      </FormContainer>
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

function MainContent({
  afterCreateOrganizationUrl,
  afterSelectOrganizationUrl,
}: {
  afterCreateOrganizationUrl?: string;
  afterSelectOrganizationUrl?: string;
}) {
  return (
    <div className="flex flex-1">
      <OrganizationFormSection
        afterCreateOrganizationUrl={afterCreateOrganizationUrl}
        afterSelectOrganizationUrl={afterSelectOrganizationUrl}
      />
      <IllustrationSection />
    </div>
  );
}

function PageContent({
  afterCreateOrganizationUrl,
  afterSelectOrganizationUrl,
}: {
  afterCreateOrganizationUrl?: string;
  afterSelectOrganizationUrl?: string;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden pb-3">
      <MainContent
        afterCreateOrganizationUrl={afterCreateOrganizationUrl}
        afterSelectOrganizationUrl={afterSelectOrganizationUrl}
      />
    </div>
  );
}

export function OrganizationCreate(props?: {
  appearance?: any;
  hidePersonal?: boolean;
  skipInvitationScreen?: boolean;
  afterSelectOrganizationUrl?: string;
  afterCreateOrganizationUrl?: string;
}) {
  const { organization } = useOrganization();
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
      });
    }
  }, [organization?.id, organization?.name, track]);

  return (
    <div className="flex w-full flex-1 flex-row items-center justify-center">
      <PageContent
        afterCreateOrganizationUrl={props?.afterCreateOrganizationUrl}
        afterSelectOrganizationUrl={props?.afterSelectOrganizationUrl}
      />
    </div>
  );
}

export default OrganizationCreate;
