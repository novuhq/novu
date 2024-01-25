import React, { useState } from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Pagination, IPaginationProps } from './Pagination';
import { PageSizeSelect } from './PageSizeSelect';
import { ButtonGroup } from './ButtonGroup';
import { GoToPageInput } from './GoToPageInput';
import { useArgs } from '@storybook/client-api';

export default {
  title: 'Components/Pagination',
  component: Pagination,
  args: {
    currentPageNumber: 5,
    totalPageCount: 10,
    totalItemCount: 100,
    onPageChange: (pageNum) => alert(pageNum),
    pageSize: 10,
  },
} as Meta<typeof Pagination>;

const TEST_PAGE_SIZES = [10, 25, 50, 100];

const Template: StoryFn<typeof Pagination> = ({ ...args }) => {
  const [{ currentPageNumber }, updateArgs] = useArgs<IPaginationProps>();

  const handlePageSizeChange = (size: number) => {
    updateArgs({ pageSize: size });
  };

  const handlePageChange = (pageNum: number) => {
    updateArgs({ currentPageNumber: pageNum });
  };

  return (
    <Pagination {...args} onPageChange={handlePageChange} currentPageNumber={currentPageNumber}>
      <PageSizeSelect onPageSizeChange={handlePageSizeChange} pageSizes={TEST_PAGE_SIZES} />
      <ButtonGroup />
      <GoToPageInput label={'Go to page'} />
    </Pagination>
  );
};

export const PaginationStory = Template.bind({});
