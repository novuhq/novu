import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { LoadingOverlay } from './LoadingOverlay';
import { Input } from '../input';
import { Button } from '../button';
import { stack } from '../../../styled-system/patterns/stack';
import { Title } from '../title';
import { Text } from '../text';
import { Box } from '../../../styled-system/jsx';
import { css } from '../../../styled-system/css';

export default {
  title: 'Components/LoadingOverlay',
  component: LoadingOverlay,
  argTypes: {
    type: {
      options: ['bars', 'oval', 'dots'],
      control: {
        type: 'radio',
      },
    },
  },
} as Meta<typeof LoadingOverlay>;

const Template: StoryFn<typeof LoadingOverlay> = ({ ...args }) => (
  <>
    <LoadingOverlay {...args} />{' '}
    <form noValidate onSubmit={(event) => event.preventDefault()} className={stack()}>
      <Title>Here is some text</Title>
      <Text>And some more!</Text>
      <Input />
      <Input />
      <Input placeholder="This won't have an error" error={undefined} />
      <Input />
      <Button type="submit">Submit</Button>
    </form>
  </>
);

export const FullPage = Template.bind({});
FullPage.args = {};

const InComponentTemplate: StoryFn<typeof LoadingOverlay> = ({ ...args }) => (
  <>
    <form
      noValidate
      onSubmit={(event) => event.preventDefault()}
      className={stack({
        maxWidth: '[500px]',
        border: 'solid',
        borderColor: 'input.border',
        padding: '150',
        borderRadius: '100',
        position: 'relative',
      })}
    >
      <LoadingOverlay {...args} />
      <Title>Here is some text</Title>
      <Text>And some more!</Text>
      <Input label="Input" />
      <Input label="Input" />
      <Input label="Input" placeholder="This won't have an error" error={undefined} />
      <Input label="Input" />
      <Button type="submit">Submit</Button>
    </form>
    <div className={stack({ mt: '150' })}>
      <Title>Here is some stuff outside the component!</Title>
      <Text>It should not be overlaid</Text>
      <Input label="Input" />
    </div>
  </>
);

export const InComponent = InComponentTemplate.bind({});
InComponent.args = {};
