import { Meta, StoryFn } from '@storybook/react/*';
import React from 'react';
import { css, cva, cx } from '../../../styled-system/css';
import { Stack, styled, Wrap } from '../../../styled-system/jsx';

export default {
  title: 'Panda Sandbox/recipes/cva',
} as Meta;

/**
 * cva is a way to create Atomic Recipes with one or more variant.
 * We use cva when we need to define multiple states for a single atomic component.
 * https://panda-css.com/docs/concepts/recipes#atomic-recipe-or-cva
 *
 * An example is a status indicator where we have a mixture of shared styling
 * but also some status-specific (variant-specific) styling.
 */
const uploadStatusDotRecipe = cva({
  // styles that should be applied to all variants (and can be overridden) are defined in base
  base: {
    margin: '100',
    borderRadius: 'circle',
  },
  variants: {
    status: {
      SUCCESS: {
        bg: '[green]',
      },
      FAILURE: {
        bg: '[red]',
      },
      IN_PROGRESS: {
        bg: '[yellow]',
      },
    },
    size: {
      sm: {
        width: '150',
        height: '150',
      },
      lg: {
        width: '300',
        height: '300',
      },
    },
  },
  // define the default values for any variants if they are not specified
  defaultVariants: {
    size: 'sm',
  },
});

const StandardTemplate: StoryFn = ({ ...args }) => {
  return (
    <Stack gap="200" margin="150">
      <Wrap gap="100">
        <span className={uploadStatusDotRecipe({ status: 'IN_PROGRESS' })} />
        <span className={uploadStatusDotRecipe({ status: 'SUCCESS' })} />
        <span className={uploadStatusDotRecipe({ status: 'FAILURE' })} />
      </Wrap>
      <Wrap gap="100">
        <span className={uploadStatusDotRecipe({ size: 'lg', status: 'IN_PROGRESS' })} />
        <span className={uploadStatusDotRecipe({ size: 'lg', status: 'SUCCESS' })} />
        <span className={uploadStatusDotRecipe({ size: 'lg', status: 'FAILURE' })} />
      </Wrap>
    </Stack>
  );
};

export const ClassName = StandardTemplate.bind({});
ClassName.args = {};

/**
 * Here we're using the `styled` function from Panda to create a type-safe JSX element based on the same recipe!
 *
 * This provides a better DX when the component needs to be consumed in multiple places because we only need
 * to import the JSX component, rather than both the recipe and the component we'd like to apply styles to
 */
const UploadStatusDot = styled('span', uploadStatusDotRecipe);

/**
 * This example should look exactly the same as the one above, but uses the generated JSX elements.
 */
const JsxTemplate: StoryFn = ({ ...args }) => {
  return (
    <Stack gap="200" margin="150">
      <Wrap gap="100">
        <UploadStatusDot status="IN_PROGRESS" />
        <UploadStatusDot status="SUCCESS" />
        <UploadStatusDot status="FAILURE" />
      </Wrap>
      <Wrap gap="100">
        <UploadStatusDot size="lg" status="IN_PROGRESS" />
        <UploadStatusDot size="lg" status="SUCCESS" />
        <UploadStatusDot size="lg" status="FAILURE" />
      </Wrap>
    </Stack>
  );
};

export const Jsx = JsxTemplate.bind({});
Jsx.args = {};
