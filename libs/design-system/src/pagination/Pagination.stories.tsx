import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Pagination, IPaginationProps } from './Pagination';
import { PageSizeSelect } from './PageSizeSelect';

export default {
  title: 'Components/Pagination',
  component: Pagination,
  argTypes: {},
} as Meta<typeof Pagination>;

const TEST_PAGE_SIZES = [4, 6, 8];

const Template: StoryFn<typeof Pagination> = ({ ...args }) => (
  <Pagination {...args}>
    <PageSizeSelect onPageSizeChange={(val) => alert(val)} pageSizes={TEST_PAGE_SIZES} />
  </Pagination>
);

export const PaginationStory = Template.bind({});
PaginationStory.args = {
  currentPageIndex: 0,
  totalPageCount: 10,
  totalItemCount: 100,
  onPageChange: (pageNum) => alert(pageNum),
  pageSize: 10,
} as IPaginationProps;
