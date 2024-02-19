import styled from '@emotion/styled';
import { IPaginationProps, PageContainer, Pagination, colors } from '@novu/design-system';
import PageHeader from './PageHeader';
import { ITableProps } from '@novu/design-system/dist/types/table/Table';
import { ComponentProps, PropsWithChildren } from 'react';

// values directly from designs -- see comment below about why they're necessary
const FOOTER_FADE_OVERLAY_HEIGHT_PX = 20;
const FOOTER_HEIGHT_PX = 64;
const TOTAL_FOOTER_HEIGHT_PX = FOOTER_HEIGHT_PX + FOOTER_FADE_OVERLAY_HEIGHT_PX;

const StickyFooter = styled.footer`
  position: sticky;
  bottom: 0;
  /**
   * :( Required CSS witchery because the PageContainer and other contained elements doesn't use Flexbox or Grid.
   * We can't use position: fixed or absolute because the PageContainer width is dynamic, and we can't inherit it.
   * 'sticky' alone doesn't work, so we have to force the element to a calculated position.
   */
  top: calc(100% - ${TOTAL_FOOTER_HEIGHT_PX}px);
  max-height: ${TOTAL_FOOTER_HEIGHT_PX}px;

  /** adds a faded overlay to give depth to the footer */
  border-width: ${FOOTER_FADE_OVERLAY_HEIGHT_PX}px 0 0 0;
  border-style: solid;
  border-image: ${({ theme }) =>
      theme.colorScheme === 'dark'
        ? `linear-gradient(0deg, ${colors.B15}FF 0%, ${colors.B15}00 100%)`
        : `linear-gradient(0deg, ${colors.white}FF 0%, ${colors.white}00 100%)`}
    100% 0 0 0;

  /* TODO: use theme values */
  z-index: 5;
`;

const PaginationWrapper = styled.div`
  /* TODO: use theme values */
  padding: 12px 24px 20px 24px;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.white)};
`;

export interface IListPageProps<TRow extends object> extends Omit<ITableProps<TRow>, 'pagination'> {
  title: string;
  paginationInfo?: IPaginationProps & ComponentProps<typeof Pagination.PageSizeSelect>;
}

export const ListPage = <TRow extends object>({
  title,
  paginationInfo,
  children,
}: PropsWithChildren<IListPageProps<TRow>>) => {
  return (
    <PageContainer title={title}>
      <PageHeader title={title} />
      {children}
      {paginationInfo && (
        <>
          <StickyFooter>
            <PaginationWrapper>
              <Pagination
                totalItemCount={paginationInfo.totalItemCount}
                totalPageCount={paginationInfo.totalPageCount}
                currentPageNumber={paginationInfo.currentPageNumber}
                pageSize={paginationInfo.pageSize}
                onPageChange={paginationInfo.onPageChange}
              >
                <Pagination.PageSizeSelect onPageSizeChange={paginationInfo.onPageSizeChange} />
                <Pagination.ControlBar />
                <Pagination.GoToPageInput label={'Go to'} placeholder={'page'} />
              </Pagination>
            </PaginationWrapper>
          </StickyFooter>
        </>
      )}
    </PageContainer>
  );
};
