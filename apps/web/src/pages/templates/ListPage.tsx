import styled from '@emotion/styled';
import { PageContainer, Pagination, colors } from '@novu/design-system';
import PageHeader from '../../components/layout/components/PageHeader';
import { ITableProps } from '@novu/design-system/dist/types/table/Table';
import { PropsWithChildren } from 'react';

const StickyFooter = styled.div`
  position: sticky;
  width 100%;
`;

const PaginationWrapper = styled.div`
  width: inherit;
  /* TODO: use theme values */
  padding: 12px 24px 20px 24px;
  background-color: ${({ theme }) => (theme.colorScheme !== 'light' ? colors.B15 : colors.white)};
`;

export interface IListPageProps<TRow extends object> extends ITableProps<TRow> {
  title: string;
}

export const ListPage = <TRow extends object>({ title, children }: PropsWithChildren<IListPageProps<TRow>>) => {
  return (
    <PageContainer title={title}>
      <PageHeader title={title} />
      {/* <Table
        loading={isLoading}
        data-test-id="subscribers-table"
        columns={columns}
        data={subscribers || []}
        pagination={{
          pageSize: pageSize,
          current: page,
          hasMore,
          minimalPagination: true,
          onPageChange: handleTableChange,
        }}
      /> */}
      {children}
      <StickyFooter>
        <PaginationWrapper>
          <Pagination
            totalPageCount={100}
            totalItemCount={1000}
            pageSize={10}
            onPageChange={() => {
              console.log('Page change');
            }}
            currentPageNumber={1}
          >
            <Pagination.PageSizeSelect
              onPageSizeChange={() => {
                console.log('Page size change');
              }}
            />
            <Pagination.ControlBar />
            <Pagination.GoToPageInput label={'Go to'} placeholder={'page'} />
          </Pagination>
        </PaginationWrapper>
      </StickyFooter>
      <div style={{ height: '1px' }}></div>
    </PageContainer>
  );
};
