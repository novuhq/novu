import React from 'react';
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

const TEST_PAGE_SIZES = [4, 6, 8];

const Template: StoryFn<typeof Pagination> = ({ ...args }) => {
  const [{ currentPageNumber }, updateArgs] = useArgs<IPaginationProps>();

  const handlePageChange = (pageNum: number) => {
    updateArgs({ currentPageNumber: pageNum });
  };

  return (
    <Pagination {...args} onPageChange={handlePageChange} currentPageNumber={currentPageNumber}>
      <PageSizeSelect onPageSizeChange={(val) => alert(val)} pageSizes={TEST_PAGE_SIZES} />
      <ButtonGroup></ButtonGroup>
      <GoToPageInput label={'Go to page'} />
    </Pagination>
  );
};

export const PaginationStory = Template.bind({});
