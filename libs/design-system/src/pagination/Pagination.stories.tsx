import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Pagination, PaginationProps } from './Pagination';

export default {
  title: 'Components/Pagination',
  component: Pagination,
  argTypes: {},
} as Meta<typeof Pagination>;

const Template: StoryFn<typeof Pagination> = ({ ...args }) => <Pagination {...args} />;

export const PaginationStory = Template.bind({});
PaginationStory.args = {
  currentPageIndex: 0,
  totalPageCount: 10,
  totalItemCount: 100,
  onPageChange: (pageNum) => alert(pageNum),
  pageSize: 10,
} as PaginationProps;
