import { useOrganizationList, useUser } from '@clerk/react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { RiAddCircleLine, RiArrowRightSLine, RiLoader4Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/primitives/avatar';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { ScrollArea } from '@/components/primitives/scroll-area';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { IS_NOVU_CONNECT } from '@/config';
import { RegionSelector, useShouldShowRegionSelector } from '@/context/region';
import { useTelemetry } from '@/hooks/use-telemetry';
import { APP_IDS, type AppId, isAbsoluteUrl } from '@/utils/apps';
import {
  beginOnboardingProvisioning,
  clearOnboardingProvisioning,
  isConnectWorkspace,
  writeConnectAutoCreateSessionGuard,
} from '@/utils/connect';
import { isPlatformWorkspace } from '@/utils/platform-workspace';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';

const SLUG_MAX_LENGTH = 50;
const SLUG_RETRY_LIMIT = 3;
// Row ≈ 56px (size-8 avatar + py-3). Cap visible rows at 6, past that the list scrolls.
const ORG_LIST_VISIBLE_ROWS = 6;
// Fixed height — Radix ScrollArea's Viewport uses h-full, which needs a definite parent
// height to scroll. `max-h` alone leaves the Viewport auto-sized so content gets clipped
// without a scrollbar appearing. Applied only when scrolling is actually needed.
const ORG_LIST_SCROLL_HEIGHT = 'h-[336px]';
// Clerk defaults to 10 per page — we override because the picker filters by `productType` and
// needs the full list before it can decide whether to auto-switch to the create view. Bumping
// to 100 (well under Clerk's 500 cap) puts virtually every real-world user on a single round trip.
const MEMBERSHIPS_PAGE_SIZE = 100;

type ProductFilter = 'platform' | 'connect';

type OrganizationMembershipLike = {
  id: string;
  organization: {
    id: string;
    name: string;
    slug?: string | null;
    imageUrl: string;
    publicMetadata: Record<string, unknown>;
  };
};

type OrganizationPickerProps = {
  afterCreateOrganizationUrl: string;
  afterSelectOrganizationUrl: string;
  // Invoked when the user cancels the create form with no orgs to fall back to.
  onSignOut: () => void | Promise<void>;
};

type View = 'picker' | 'create';

function getInitials(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) return '?';

  return trimmed
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH);
}

function getProductFilter(): ProductFilter {
  return IS_NOVU_CONNECT ? 'connect' : 'platform';
}

function getProductAppId(filter: ProductFilter): AppId {
  return filter === 'connect' ? APP_IDS.CONNECT : APP_IDS.NOVU;
}

function isMatchingMembership(membership: OrganizationMembershipLike, filter: ProductFilter): boolean {
  const metadata = membership.organization.publicMetadata;

  return filter === 'connect' ? isConnectWorkspace(metadata) : isPlatformWorkspace(metadata);
}

function isSlugTakenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const errors = (error as { errors?: Array<{ code?: string; meta?: { paramName?: string } }> }).errors;
  if (!Array.isArray(errors)) return false;

  return errors.some(
    (entry) =>
      entry?.meta?.paramName === 'slug' &&
      (entry.code === 'form_identifier_exists' || entry.code === 'form_param_value_invalid')
  );
}

function readClerkErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const errors = (error as { errors?: Array<{ message?: string; longMessage?: string }> }).errors;

  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];

    return first.longMessage || first.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

type OrganizationAvatarProps = {
  imageUrl?: string;
  name: string;
  className?: string;
};

function OrganizationAvatar({ imageUrl, name, className }: OrganizationAvatarProps) {
  return (
    <Avatar className={cn('size-8 rounded-full', className)}>
      {imageUrl ? <AvatarImage src={imageUrl} alt={name} /> : null}
      <AvatarFallback className="bg-linear-to-br from-primary-base via-primary-base to-error-base text-static-white text-xs font-medium">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

type OrganizationRowProps = {
  membership: OrganizationMembershipLike;
  onSelect: (organizationId: string) => void;
  isBusy: boolean;
  busyId: string | null;
};

function OrganizationRow({ membership, onSelect, isBusy, busyId }: OrganizationRowProps) {
  const isCurrentlySelecting = busyId === membership.organization.id;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      onClick={() => onSelect(membership.organization.id)}
      disabled={isBusy}
      className={cn(
        'group flex w-full items-center gap-3 px-1 py-3 text-left transition-colors',
        'border-t border-stroke-soft first:border-t-0',
        'hover:bg-bg-weak/40 disabled:cursor-default disabled:opacity-60'
      )}
    >
      <OrganizationAvatar imageUrl={membership.organization.imageUrl} name={membership.organization.name} />
      <span className="text-label-sm text-text-strong min-w-0 flex-1 truncate font-medium">
        {membership.organization.name}
      </span>
      {isCurrentlySelecting ? (
        <RiLoader4Line className="text-text-sub size-4 shrink-0 animate-spin" />
      ) : (
        <RiArrowRightSLine className="text-text-soft size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </motion.button>
  );
}

type OrganizationListViewProps = {
  memberships: OrganizationMembershipLike[];
  onSelect: (organizationId: string) => void;
  onCreateClick: () => void;
  productFilter: ProductFilter;
  isBusy: boolean;
  busyId: string | null;
  // True while additional pages are streaming in from Clerk after page 1 has rendered.
  isLoadingMore: boolean;
};

function OrganizationListView({
  memberships,
  onSelect,
  onCreateClick,
  productFilter,
  isBusy,
  busyId,
  isLoadingMore,
}: OrganizationListViewProps) {
  const productLabel = productFilter === 'connect' ? 'Novu Connect' : 'Novu Cloud';
  const shouldScroll = memberships.length > ORG_LIST_VISIBLE_ROWS || isLoadingMore;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-label-md text-text-strong font-medium">Choose an organization</h1>
        <p className="text-label-sm text-text-sub">to continue to {productLabel}</p>
      </div>

      <div className="flex min-h-0 flex-col">
        <ScrollArea className={cn('w-full', shouldScroll && ORG_LIST_SCROLL_HEIGHT)}>
          {/* `pr-2` reserves room for the overlay scrollbar so the row chevron doesn't get clipped. */}
          <div className="flex flex-col pr-2">
            <AnimatePresence initial={false} mode="popLayout">
              {memberships.map((membership) => (
                <OrganizationRow
                  key={membership.id}
                  membership={membership}
                  onSelect={onSelect}
                  isBusy={isBusy}
                  busyId={busyId}
                />
              ))}
            </AnimatePresence>

            {isLoadingMore ? (
              <div
                className="border-stroke-soft flex items-center justify-center gap-2 border-t py-3"
                aria-live="polite"
              >
                <RiLoader4Line className="text-text-sub size-4 animate-spin" />
                <span className="text-label-xs text-text-sub">Loading more organizations…</span>
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <button
          type="button"
          onClick={onCreateClick}
          disabled={isBusy}
          className={cn(
            'group flex w-full shrink-0 items-center gap-3 px-1 py-3 text-left transition-colors',
            'border-t border-stroke-soft',
            'hover:bg-bg-weak/40 disabled:cursor-default disabled:opacity-60'
          )}
        >
          <span className="border-stroke-soft flex size-8 items-center justify-center rounded-full border border-dashed">
            <RiAddCircleLine className="text-text-sub size-4" />
          </span>
          <span className="text-label-sm text-text-sub flex-1 font-medium">Create organization</span>
        </button>
      </div>
    </div>
  );
}

type CreateOrganizationViewProps = {
  defaultName?: string;
  hasExistingOrgs: boolean;
  onCancel: () => void;
  onSubmit: (input: { name: string; slug: string }) => Promise<void>;
  isSubmitting: boolean;
  productFilter: ProductFilter;
};

function CreateOrganizationView({
  defaultName = '',
  hasExistingOrgs,
  onCancel,
  onSubmit,
  isSubmitting,
  productFilter,
}: CreateOrganizationViewProps) {
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(() => slugify(defaultName));
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  // Connect workspaces are pinned to a single region, so the selector never applies there.
  const shouldShowRegionSelector = useShouldShowRegionSelector() && productFilter !== 'connect';
  const nameId = useId();
  const slugId = useId();

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallyEdited]);

  const trimmedName = name.trim();
  const trimmedSlug = slug.trim();
  const productLabel = productFilter === 'connect' ? 'Novu Connect' : 'Novu Cloud';
  const canSubmit = trimmedName.length > 0 && trimmedSlug.length > 0 && !isSubmitting;

  const cancelLabel = hasExistingOrgs ? 'Cancel' : 'Sign out';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    await onSubmit({
      name: trimmedName,
      slug: trimmedSlug,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-label-md text-text-strong font-medium">Create Organization</h1>
        <p className="text-label-sm text-text-sub">Set up your {productLabel} workspace.</p>
      </div>

      {shouldShowRegionSelector ? (
        <div className="flex items-center gap-2">
          <span className="text-label-xs text-text-strong font-medium">Region:</span>
          <RegionSelector />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className="text-label-xs text-text-strong font-medium">
          Name
        </label>
        <Input
          id={nameId}
          name="name"
          placeholder="Organization name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isSubmitting}
          autoFocus
          required
          maxLength={100}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={slugId} className="text-label-xs text-text-strong font-medium">
          URL friendly identifier
        </label>
        <Input
          id={slugId}
          name="slug"
          placeholder="my-org"
          value={slug}
          onChange={(event) => {
            setSlugManuallyEdited(true);
            setSlug(event.target.value.toLowerCase());
          }}
          disabled={isSubmitting}
          required
          maxLength={SLUG_MAX_LENGTH}
        />
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" mode="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          {cancelLabel}
        </Button>
        <Button type="submit" variant="primary" mode="gradient" size="sm" disabled={!canSubmit}>
          {isSubmitting ? (
            <>
              <RiLoader4Line className="size-4 animate-spin" />
              Creating…
            </>
          ) : (
            'Create organization'
          )}
        </Button>
      </div>
    </form>
  );
}

// Replacement for Clerk's <OrganizationList/> that filters memberships by `publicMetadata.productType`.
export function OrganizationPicker({
  afterCreateOrganizationUrl,
  afterSelectOrganizationUrl,
  onSignOut,
}: OrganizationPickerProps) {
  const track = useTelemetry();
  const { user } = useUser();
  const navigate = useNavigate();

  const productFilter = useMemo(getProductFilter, []);
  const productAppId = useMemo(() => getProductAppId(productFilter), [productFilter]);

  const { isLoaded, userMemberships, createOrganization, setActive } = useOrganizationList({
    userMemberships: { infinite: true, pageSize: MEMBERSHIPS_PAGE_SIZE },
  });

  const [hasRevalidated, setHasRevalidated] = useState(false);

  // Read through a ref so calling `revalidate()` (which flips Clerk's internal state and rotates
  // the resource reference) doesn't re-fire effects and cancel the in-flight refresh before
  // `setHasRevalidated(true)` runs.
  const userMembershipsRef = useRef(userMemberships);
  userMembershipsRef.current = userMemberships;

  // Force a fresh fetch on mount so a user arriving after delete/leave doesn't see a tombstoned
  // org, and so a freshly-accepted invitation membership (e.g. from a Clerk-hosted accept page)
  // shows up immediately when the user is redirected back to Novu.
  useEffect(() => {
    if (!isLoaded || hasRevalidated) return;

    let cancelled = false;
    const refresh = async () => {
      try {
        await userMembershipsRef.current?.revalidate?.();
      } catch {
        // Revalidation failures shouldn't strand the user — show whatever is cached.
      } finally {
        if (!cancelled) {
          setHasRevalidated(true);
        }
      }
    };

    void refresh();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, hasRevalidated]);

  // Drain pagination so productType filtering runs against the full membership list. Mirrors
  // the pre-fetch behavior in `OrganizationDropdown` when its region filter is active — both
  // need a complete list before they can safely render filtered results.
  useEffect(() => {
    if (!isLoaded || !userMemberships?.hasNextPage || userMemberships?.isFetching) {
      return;
    }

    userMemberships.fetchNext?.();
  }, [isLoaded, userMemberships?.hasNextPage, userMemberships?.isFetching, userMemberships]);

  // Two readiness signals:
  //   - `isFirstPageReady` — render the picker as soon as page 1 lands so users with many orgs
  //     don't wait on a full-screen spinner while later pages stream in.
  //   - `isFullListLoaded` — gate both the "auto-switch to create view if empty" and the
  //     cross-product redirect decisions on the complete list (a matching org might sit on
  //     page 2; the cross-product check needs all pages drained to be accurate).
  const isFirstPageReady = isLoaded && hasRevalidated;
  const isFullListLoaded = isFirstPageReady && !userMemberships?.isFetching && userMemberships?.hasNextPage !== true;

  const allMemberships = useMemo<OrganizationMembershipLike[]>(
    () => (userMemberships?.data ?? []) as OrganizationMembershipLike[],
    [userMemberships?.data]
  );

  const filteredMemberships = useMemo<OrganizationMembershipLike[]>(
    () => allMemberships.filter((membership) => isMatchingMembership(membership, productFilter)),
    [allMemberships, productFilter]
  );

  const [view, setView] = useState<View>('picker');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const hasTrackedRef = useRef(false);
  const hasInitializedViewRef = useRef(false);

  // Initial routing decision once the full membership list is in. If there are zero matching
  // workspaces (post-delete, post-leave, or a fresh sign-up that didn't auto-provision), drop
  // into the create form. No cross-product bouncing: invited memberships often arrive without
  // `publicMetadata.productType` set yet, so any host-hop decision based on that metadata is
  // unreliable — better to let the user create / pick on the host they're currently on.
  useEffect(() => {
    if (!isFullListLoaded || hasInitializedViewRef.current) return;

    hasInitializedViewRef.current = true;

    if (filteredMemberships.length === 0) {
      setView('create');
    }
  }, [isFullListLoaded, filteredMemberships.length]);

  const handleSelect = useCallback(
    async (organizationId: string) => {
      if (!setActive || isSelecting) return;

      setIsSelecting(true);
      setSelectingId(organizationId);

      try {
        await setActive({ organization: organizationId });
        window.location.assign(afterSelectOrganizationUrl);
      } catch (error) {
        const message = readClerkErrorMessage(error, 'Unable to switch organizations.');
        showErrorToast(message, 'Organization switch failed');
        setIsSelecting(false);
        setSelectingId(null);
      }
    },
    [setActive, afterSelectOrganizationUrl, isSelecting]
  );

  const handleCreate = useCallback(
    async ({ name, slug }: { name: string; slug: string }) => {
      if (!createOrganization || !setActive) return;

      const provisioningVariant = productFilter === 'connect' ? 'connect' : 'platform';

      setIsCreating(true);
      beginOnboardingProvisioning(provisioningVariant);

      let createdOrg: Awaited<ReturnType<typeof createOrganization>> | null = null;
      let lastError: unknown = null;

      // Retry with a numeric suffix on slug collision so common names don't need manual renames.
      for (let attempt = 0; attempt < SLUG_RETRY_LIMIT; attempt += 1) {
        const candidateSlug = attempt === 0 ? slug : `${slug}-${Math.floor(Math.random() * 9000 + 1000)}`;

        try {
          createdOrg = await createOrganization({ name, slug: candidateSlug });
          break;
        } catch (error) {
          lastError = error;
          if (!isSlugTakenError(error)) {
            break;
          }
        }
      }

      if (!createdOrg) {
        clearOnboardingProvisioning();
        const message = readClerkErrorMessage(lastError, 'Failed to create organization.');
        showErrorToast(message, 'Create organization failed');
        setIsCreating(false);

        return;
      }

      // `productType: connect` is written server-side during sync; the guard bridges that lag.
      if (productFilter === 'connect' && user?.id) {
        writeConnectAutoCreateSessionGuard(user.id, createdOrg.id);
      }

      try {
        await setActive({ organization: createdOrg.id });
      } catch (error) {
        clearOnboardingProvisioning();
        const message = readClerkErrorMessage(error, 'Failed to activate the new organization.');
        showErrorToast(message, 'Activation failed');
        setIsCreating(false);

        return;
      }

      track(TelemetryEvent.CREATE_ORGANIZATION_FORM_SUBMITTED, {
        location: 'web',
        organizationId: createdOrg.id,
        organizationName: createdOrg.name,
        product: productAppId,
        autoCreated: false,
      });
      hasTrackedRef.current = true;

      if (isAbsoluteUrl(afterCreateOrganizationUrl)) {
        window.location.assign(afterCreateOrganizationUrl);

        return;
      }

      void navigate(afterCreateOrganizationUrl);
    },
    [createOrganization, setActive, afterCreateOrganizationUrl, productAppId, productFilter, track, user?.id, navigate]
  );

  const handleCancel = useCallback(() => {
    if (filteredMemberships.length > 0) {
      setView('picker');

      return;
    }

    void onSignOut();
  }, [filteredMemberships.length, onSignOut]);

  // Show the full-screen spinner only while page 1 is in flight. Once page 1 lands we render the
  // picker and surface the inline "Loading more…" row for any subsequent pages — same model as
  // `OrganizationDropdown`. Exception: if page 1 yields no matching orgs but more pages are
  // still streaming, keep the spinner so we don't briefly render an empty header and falsely
  // run the cross-product redirect.
  const isStreamingMorePages = isFirstPageReady && !isFullListLoaded;
  const shouldWaitForMorePages = isStreamingMorePages && filteredMemberships.length === 0;

  if (!isFirstPageReady || shouldWaitForMorePages) {
    return (
      <div className="flex min-h-[280px] w-full items-center justify-center">
        <RiLoader4Line className="text-text-sub size-5 animate-spin" />
      </div>
    );
  }

  if (view === 'create') {
    return (
      <CreateOrganizationView
        hasExistingOrgs={filteredMemberships.length > 0}
        onCancel={handleCancel}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
        productFilter={productFilter}
      />
    );
  }

  return (
    <OrganizationListView
      memberships={filteredMemberships}
      onSelect={handleSelect}
      onCreateClick={() => setView('create')}
      productFilter={productFilter}
      isBusy={isSelecting || isCreating}
      busyId={selectingId}
      isLoadingMore={isStreamingMorePages}
    />
  );
}
