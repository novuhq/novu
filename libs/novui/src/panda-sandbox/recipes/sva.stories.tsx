import { Meta, StoryFn } from '@storybook/react/*';
import React, { FC } from 'react';
import { RecipeVariant, sva } from '../../../styled-system/css';
import { Stack } from '../../../styled-system/jsx';

export default {
  title: 'Panda Sandbox/recipes/sva',
} as Meta;

/**
 * sva is a way to create Atomic Recipes
 * https://panda-css.com/docs/concepts/recipes#atomic-recipe-or-sva
 */
const uploadStatusRecipe = sva({
  slots: ['root', 'label', 'indicator'],
  // styles that should be applied to all variants (and can be overridden) are defined in base
  base: {
    root: {
      border: 'solid',
      borderRadius: 'pill',
      display: 'flex',
      width: '[max-content]',
      alignItems: 'center',
      gap: '75',
      padding: '50',
      paddingX: '100',
    },
    label: {
      color: '[inherit]',
      fontWeight: 'strong',
      fontFamily: 'mono',
    },
    indicator: {
      width: '100',
      height: '100',
      borderRadius: 'circle',
    },
  },
  variants: {
    status: {
      SUCCESS: {
        indicator: {
          bg: '[green]',
        },
        root: {
          borderColor: '[green]',
          color: '[green]',
        },
      },
      FAILURE: {
        indicator: {
          bg: '[red]',
        },
        root: {
          borderColor: '[red]',
          color: '[red]',
        },
      },
      IN_PROGRESS: {
        indicator: {
          bg: '[yellow]',
        },
        root: {
          borderColor: '[yellow]',
          color: '[yellow]',
        },
      },
    },
  },
});

type UploadStatusProps = RecipeVariant<typeof uploadStatusRecipe>;

const UPLOAD_STATUS_LABELS: Record<UploadStatusProps['status'], string> = {
  SUCCESS: 'Success',
  FAILURE: 'Failure',
  IN_PROGRESS: 'Pending',
};

const UploadStatus: FC<UploadStatusProps> = ({ status }) => {
  const classes = uploadStatusRecipe({ status });

  return (
    <div className={classes.root}>
      <p className={classes.label}>{UPLOAD_STATUS_LABELS[status]}</p>
      <span className={classes.indicator} />
    </div>
  );
};

const StandardTemplate: StoryFn = ({ ...args }) => {
  return (
    <Stack gap="200" margin="150">
      <UploadStatus status="IN_PROGRESS" />
      <UploadStatus status="FAILURE" />
      <UploadStatus status="SUCCESS" />
    </Stack>
  );
};

export const ClassName = StandardTemplate.bind({});
ClassName.args = {};

/**
 * Unlike the atomic recipe or cva, slot recipes are not meant to be used directly
 * in the styled factory since it returns an object of classes instead of a single class.
 */
