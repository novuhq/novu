import { TranslationGroupDto } from '@novu/api/models/components';
import { ApiServiceLevelEnum, DEFAULT_LOCALE, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';
import { HTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import { TranslationsFilter } from '@/api/translations';
import { DefaultPagination } from '@/components/default-pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/primitives/table';
import { IS_ENTERPRISE, IS_SELF_HOSTED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { ListNoResults } from '../list-no-results';
import { DEFAULT_TRANSLATIONS_LIMIT } from './constants';
import { DeleteTranslationGroupDialog } from './delete-translation-modal';
import { useDeleteTranslationModal } from './hooks/use-delete-translation-modal';
import { useTranslationListLogic } from './hooks/use-translation-list-logic';
import { TranslationsUrlState } from './hooks/use-translations-url-state';
import { TranslationListUpgradeCta } from './translation-list-upgrade-cta';
import { TranslationOnboardingPage } from './translation-onboarding-page';
import { TranslationRow, TranslationRowSkeleton } from './translation-row';
import { TranslationsFilters } from './translations-filters';

type TranslationListHeaderProps = HTMLAttributes<HTMLDivElement> &
  Pick<TranslationsUrlState, 'filterValues' | 'handleFiltersChange' | 'resetFilters'> & {
    isFetching?: boolean;
  };

function TranslationListHeader({
  className,
  filterValues,
  handleFiltersChange,
  resetFilters,
  isFetching,
  ...props
}: TranslationListHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between py-2', className)} {...props}>
      <TranslationsFilters
        onFiltersChange={handleFiltersChange}
        filterValues={filterValues}
        onReset={resetFilters}
        isFetching={isFetching}
      />
    </div>
  );
}

type TranslationTableProps = HTMLAttributes<HTMLTableElement> & {
  children: React.ReactNode;
  data?: {
    total: number;
    limit: number;
    offset: number;
  };
};

function TranslationTable({ children, data, ...props }: TranslationTableProps) {
  const currentPage = data ? Math.floor(data.offset / data.limit) + 1 : 1;
  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <Table {...props}>
      <TableHeader>
        <TableRow>
          <TableHead>Resource</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Languages</TableHead>
          <TableHead>Created at</TableHead>
          <TableHead>Updated at</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
      {data && data.limit < data.total && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>
              <div className="flex items-center justify-between">
                <span className="text-foreground-600 block text-sm font-normal">
                  Page {currentPage} of {totalPages}
                </span>
                <DefaultPagination
                  hrefFromOffset={(offset) => {
                    const params = new URLSearchParams(window.location.search);

                    if (offset === 0) {
                      params.delete('offset');
                    } else {
                      params.set('offset', offset.toString());
                    }

                    return `${window.location.pathname}?${params.toString()}`;
                  }}
                  totalCount={data.total}
                  limit={data.limit}
                  offset={data.offset}
                />
              </div>
            </TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}

type TranslationSkeletonListProps = {
  count: number;
};

function TranslationSkeletonList({ count }: TranslationSkeletonListProps) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <TranslationRowSkeleton key={index} />
      ))}
    </>
  );
}

type TranslationListContentProps = {
  translations: TranslationGroupDto[];
  onTranslationClick: (translation: TranslationGroupDto) => void;
  onDeleteClick: (translation: TranslationGroupDto) => void;
};

function TranslationListContent({ translations, onTranslationClick, onDeleteClick }: TranslationListContentProps) {
  return (
    <>
      {translations.map((translation) => (
        <TranslationRow
          key={`${translation.resourceId}-${translation.resourceType}`}
          translation={translation}
          onTranslationClick={onTranslationClick}
          onDeleteClick={onDeleteClick}
        />
      ))}
    </>
  );
}

type TranslationListContainerProps = HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  filterValues: TranslationsFilter;
  handleFiltersChange: (filters: Partial<TranslationsFilter>) => void;
  resetFilters: () => void;
  isFetching?: boolean;
};

function TranslationListContainer({
  className,
  children,
  filterValues,
  handleFiltersChange,
  resetFilters,
  isFetching,
  ...props
}: TranslationListContainerProps) {
  return (
    <div className={cn('flex h-full flex-col', className)} {...props}>
      <TranslationListHeader
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        isFetching={isFetching}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}

type TranslationListProps = HTMLAttributes<HTMLDivElement>;

export function TranslationList(props: TranslationListProps) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const { data: organizationSettings } = useFetchOrganizationSettings();
  const { subscription } = useFetchSubscription();

  const canUseTranslationFeature =
    getFeatureForTierAsBoolean(
      FeatureNameEnum.AUTO_TRANSLATIONS,
      subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE
    ) &&
    (!IS_SELF_HOSTED || IS_ENTERPRISE);

  // Only make API call if user has proper tier
  const { filterValues, handleFiltersChange, resetFilters, data, isPending, isFetching, areFiltersApplied } =
    useTranslationListLogic({ enabled: canUseTranslationFeature });

  const handleTranslationClick = (translation: TranslationGroupDto) => {
    if (currentEnvironment?.slug) {
      const orgDefaultLocale = organizationSettings?.data?.defaultLocale || DEFAULT_LOCALE;
      const selectedLocale = translation.locales.includes(orgDefaultLocale) ? orgDefaultLocale : translation.locales[0];

      navigate(
        buildRoute(ROUTES.TRANSLATIONS_EDIT, {
          environmentSlug: currentEnvironment.slug,
          resourceType: translation.resourceType,
          resourceId: translation.resourceId,
          locale: selectedLocale,
        })
      );
    }
  };

  const { deleteModalTranslation, isDeletePending, handleDeleteClick, handleDeleteConfirm, handleDeleteCancel } =
    useDeleteTranslationModal();

  const limit = data?.limit || DEFAULT_TRANSLATIONS_LIMIT;

  if (!canUseTranslationFeature) {
    return <TranslationListUpgradeCta />;
  }

  if (isPending) {
    return (
      <TranslationListContainer
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        isFetching={isFetching}
        {...props}
      >
        <TranslationTable>
          <TranslationSkeletonList count={limit} />
        </TranslationTable>
      </TranslationListContainer>
    );
  }

  if (!areFiltersApplied && !data?.data.length) {
    return <TranslationOnboardingPage />;
  }

  if (!data?.data.length) {
    return (
      <TranslationListContainer
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        isFetching={isFetching}
        {...props}
      >
        <div className="flex h-full w-full flex-col items-center justify-center">
          <ListNoResults
            title="No translations found"
            description="We couldn't find any translations that match your search criteria. Try adjusting your filters."
            onClearFilters={resetFilters}
          />
        </div>
      </TranslationListContainer>
    );
  }

  return (
    <>
      <TranslationListContainer
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        isFetching={isFetching}
        {...props}
      >
        <TranslationTable data={data}>
          <TranslationListContent
            translations={data.data}
            onTranslationClick={handleTranslationClick}
            onDeleteClick={handleDeleteClick}
          />
        </TranslationTable>
      </TranslationListContainer>

      {deleteModalTranslation && (
        <DeleteTranslationGroupDialog
          translationGroup={deleteModalTranslation}
          open={!!deleteModalTranslation}
          onOpenChange={(open) => !open && handleDeleteCancel()}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeletePending}
        />
      )}
    </>
  );
}
