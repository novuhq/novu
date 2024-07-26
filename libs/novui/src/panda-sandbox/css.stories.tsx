import { Meta, StoryFn } from '@storybook/react/*';
import React from 'react';
import { css, cx } from '../../styled-system/css';

export default {
  title: 'Panda Sandbox/css',
} as Meta;

// css simply outputs a className string
const className = css({
  padding: '200',
  margin: '150',
  textAlign: 'center',
  borderRadius: '100',
  backgroundColor: 'surface.panel',
  fontFamily: 'system',
  fontSize: '225',
  fontWeight: 'strong',
  color: 'typography.text.feedback.success',

  _hover: {
    bg: 'button.secondary.background',
    cursor: 'crosshair',
    boxShadow: 'medium',
    // pink is not a valid token in our system, so we use [] as an escape syntax
    color: '[pink]',
  },
});

const StandardTemplate: StoryFn = ({ ...args }) => {
  return <div className={className}>Hello Panda 🐼! css()</div>;
};

export const Standard = StandardTemplate.bind({});
Standard.args = {};

/**
 * cx is a Panda-generated function for merging classNames. You can just concatenate strings, but cx is cleaner.
 * Like in normal css, later-defined properties take precedence.
 */
const CombinedTemplate: StoryFn = ({ ...args }) => {
  return <div className={cx(className, css({ color: 'typography.text.feedback.warning' }))}>Hello Panda 🐼! cx()</div>;
};

export const Combined = CombinedTemplate.bind({ title: 'HELLLLO!s' });
Combined.args = {};
