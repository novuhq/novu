import { Meta, StoryFn } from '@storybook/react/*';
import React, { FC } from 'react';
import { RecipeVariant, sva } from '../../../styled-system/css';
import { Stack } from '../../../styled-system/jsx';

export default {
  title: 'Panda Sandbox/recipes/sva',
} as Meta;

/**
 * sva is a function to create recipes that target specific named parts / elements ("slots")
 * of a component -- it returns an object of classNames.
 *
 * https://panda-css.com/docs/concepts/slot-recipes#atomic-slot-recipe-or-sva
 *
 * sva is similar to cva, but is typically used when we have a composition of components (i.e. a composite component)
 * that contains multiple atomic components that we would like to style independently. A good example of where we would
 * use sva is for a form input component recipe, where we have a label, text input, and helper text that each have
 * their own styles.
 */
const uploadStatusRecipe = sva({
  // specify the names of the different slots
  slots: ['root', 'label', 'indicator'],
  // styles that should be applied to all variants (and can be overridden) are defined in base
  base: {
    // scope the styles below exclusively to the "root" element.
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
        // based on the variant, we can style each slot differently
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
