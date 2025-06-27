import { HTMLAttributes, useState, useCallback } from 'react';

import { cn } from '@/utils/ui';
import { DefaultPagination } from '@/components/default-pagination';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
  TableCell,
} from '@/components/primitives/table';
import { TranslationGroup } from '@/api/translations';
import { useFetchTranslations } from '@/hooks/use-fetch-translations';
import { DEFAULT_TRANSLATIONS_LIMIT } from './constants';

import { TranslationsFilter, TranslationsUrlState, useTranslationsUrlState } from './hooks/use-translations-url-state';
import { TranslationListBlank } from './translation-list-blank';
import { ListNoResults } from '../list-no-results';
import { TranslationRow, TranslationRowSkeleton } from './translation-row';
import { TranslationsFilters } from './translations-filters';
import { TranslationDrawer } from './translation-drawer/translation-drawer';

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
    <div className={cn('flex items-center justify-between py-2.5', className)} {...props}>
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
          <TableHead>Locales</TableHead>
          <TableHead>Created at</TableHead>
          <TableHead>Updated at</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
      {data && data.limit < data.total && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>
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
  translations: TranslationGroup[];
  onTranslationClick: (translation: TranslationGroup) => void;
  onImportSuccess?: () => void;
};

function TranslationListContent({ translations, onTranslationClick, onImportSuccess }: TranslationListContentProps) {
  return (
    <>
      {translations.map((translation) => (
        <TranslationRow
          key={translation.resourceId}
          translation={translation}
          onTranslationClick={onTranslationClick}
          onImportSuccess={onImportSuccess}
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
    <div className={cn('flex h-full flex-col p-2', className)} {...props}>
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

function useTranslationListLogic() {
  const [selectedTranslationGroup, setSelectedTranslationGroup] = useState<TranslationGroup | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { filterValues, handleFiltersChange, resetFilters } = useTranslationsUrlState({
    total: 0,
  });

  const { data, isPending, isFetching, refetch } = useFetchTranslations(filterValues);

  const handleTranslationClick = useCallback((translationGroup: TranslationGroup) => {
    setSelectedTranslationGroup(translationGroup);
    setIsDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback((isOpen: boolean) => {
    setIsDrawerOpen(isOpen);

    if (!isOpen) {
      setSelectedTranslationGroup(null);
    }
  }, []);

  const handleTranslationGroupUpdated = useCallback(
    async (resourceId: string) => {
      const result = await refetch();
      const updatedGroup = result.data?.data.find((group) => group.resourceId === resourceId);

      if (updatedGroup) {
        setSelectedTranslationGroup({ ...updatedGroup });
      }
    },
    [refetch]
  );

  const areFiltersApplied = filterValues.query !== '';

  return {
    selectedTranslationGroup,
    isDrawerOpen,
    filterValues,
    handleFiltersChange,
    resetFilters,
    data,
    isPending,
    isFetching,
    refetch,
    handleTranslationClick,
    handleDrawerClose,
    handleTranslationGroupUpdated,
    areFiltersApplied,
  };
}

type TranslationListProps = HTMLAttributes<HTMLDivElement>;

export function TranslationList(props: TranslationListProps) {
  const {
    selectedTranslationGroup,
    isDrawerOpen,
    filterValues,
    handleFiltersChange,
    resetFilters,
    data,
    isPending,
    isFetching,
    refetch,
    handleTranslationClick,
    handleDrawerClose,
    handleTranslationGroupUpdated,
    areFiltersApplied,
  } = useTranslationListLogic();

  const limit = data?.limit || DEFAULT_TRANSLATIONS_LIMIT;

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
    return <TranslationListBlank />;
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
        <ListNoResults
          title="No translations found"
          description="We couldn't find any translations that match your search criteria. Try adjusting your filters."
          onClearFilters={resetFilters}
        />
      </TranslationListContainer>
    );
  }

  return (
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
          onImportSuccess={() => refetch()}
        />
      </TranslationTable>

      <TranslationDrawer
        isOpen={isDrawerOpen}
        onOpenChange={handleDrawerClose}
        translationGroup={selectedTranslationGroup}
        onTranslationGroupUpdated={handleTranslationGroupUpdated}
      />
    </TranslationListContainer>
  );
}
