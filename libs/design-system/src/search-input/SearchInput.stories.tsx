/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { ChangeEventHandler } from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { useArgs } from '@storybook/client-api';

import { SearchInput, ISearchInputProps } from './SearchInput';

export default {
  title: 'Components/SearchInput',
  component: SearchInput,
  args: {
    placeholder: 'Type name or identifier...',
    value: '',
  },
} as Meta<ISearchInputProps>;

// @ts-ignore-next-line
const Template: StoryFn<typeof Pagination> = ({ siblingCount, ellipsisNode, ...args }) => {
  const [{ value }, updateArgs] = useArgs<ISearchInputProps>();

  const handleOnChange: ChangeEventHandler<HTMLInputElement> = ({ target: { value: newValue } }) => {
    updateArgs({ value: newValue });
  };

  const handleOnClearClick = () => {
    updateArgs({ value: '' });
  };

  return <SearchInput {...args} value={value} onChange={handleOnChange} onClearClick={handleOnClearClick} />;
};

export const SearchInputStory = Template.bind({});
