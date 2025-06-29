import { HTMLAttributes } from 'react';

import { cn } from '@/utils/ui';
import { DefaultPagination } from '@/components/default-pagination';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import {
  TranslationsFilter,
  TranslationsUrlState,
  useTranslationsUrlState,
} from '@/components/translations/hooks/use-translations-url-state';
import { TranslationListBlank } from '@/components/translations/translation-list-blank';
import { ListNoResults } from '@/components/list-no-results';
import { TranslationRow, TranslationRowSkeleton } from '@/components/translations/translation-row';
import { TranslationsFilters } from '@/components/translations/translations-filters';
import { useFetchTranslations } from '@/hooks/use-fetch-translations';

type TranslationListFiltersProps = HTMLAttributes<HTMLDivElement> &
  Pick<TranslationsUrlState, 'filterValues' | 'handleFiltersChange' | 'resetFilters'> & {
    isFetching?: boolean;
  };

const TranslationListWrapper = (props: TranslationListFiltersProps) => {
  const { className, children, filterValues, handleFiltersChange, resetFilters, isFetching, ...rest } = props;

  return (
    <div className={cn('flex h-full flex-col p-2', className)} {...rest}>
      <div className="flex items-center justify-between">
        <TranslationsFilters
          onFiltersChange={handleFiltersChange}
          filterValues={filterValues}
          onReset={resetFilters}
          isFetching={isFetching}
          className="py-2.5"
        />
      </div>
      {children}
    </div>
  );
};

type TranslationListTableProps = HTMLAttributes<HTMLTableElement>;

const TranslationListTable = (props: TranslationListTableProps) => {
  const { children, ...rest } = props;
  return (
    <Table {...rest}>
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
    </Table>
  );
};

type TranslationListProps = HTMLAttributes<HTMLDivElement>;

export const TranslationList = (props: TranslationListProps) => {
  const { filterValues, handleFiltersChange, resetFilters } = useTranslationsUrlState({
    total: 0,
    limit: 50,
  });

  const { data, isPending, isFetching } = useFetchTranslations(filterValues);

  const areFiltersApplied = (Object.keys(filterValues) as (keyof TranslationsFilter)[]).some(
    (key) => key === 'query' && filterValues[key] !== ''
  );

  const limit = data?.limit || 50;

  if (isPending) {
    return (
      <TranslationListWrapper
        filterValues={filterValues}
        handleFiltersChange={handleFiltersChange}
        resetFilters={resetFilters}
        isFetching={isFetching}
        {...props}
      >
        <TranslationListTable>
          {new Array(limit).fill(0).map((_, index) => (
            <TranslationRowSkeleton key={index} />
          ))}
        </TranslationListTable>
      </TranslationListWrapper>
    );
  }

  if (!areFiltersApplied && !data?.data.length) {
    return <TranslationListBlank />;
  }

  if (!data?.data.length) {
    return (
      <TranslationListWrapper
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
      </TranslationListWrapper>
    );
  }

  return (
    <TranslationListWrapper
      filterValues={filterValues}
      handleFiltersChange={handleFiltersChange}
      resetFilters={resetFilters}
      isFetching={isFetching}
      {...props}
    >
      <TranslationListTable>
        {data.data.map((translation) => (
          <TranslationRow key={translation._id} translation={translation} />
        ))}
      </TranslationListTable>

      {data.total > data.limit && (
        <DefaultPagination
          offset={data.offset}
          limit={data.limit}
          totalCount={data.total}
          hrefFromOffset={(offset) => {
            const params = new URLSearchParams(window.location.search);

            if (offset === 0) {
              params.delete('offset');
            } else {
              params.set('offset', offset.toString());
            }

            return `${window.location.pathname}?${params.toString()}`;
          }}
        />
      )}
    </TranslationListWrapper>
  );
};
