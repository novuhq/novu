import React from 'react';
import { DocsContainer as BaseContainer } from '@storybook/addon-docs';
import { useDarkMode } from 'storybook-dark-mode';
import { themes } from '@storybook/theming';

export const DocsContainer = ({ children, context }) => {
  const dark = useDarkMode();

  return (
    <BaseContainer
      context={{
        ...context,
        storyById: (id) => {
          const storyContext = context.storyById(id);
          return {
            ...storyContext,
            parameters: {
              ...storyContext?.parameters,
              docs: {
                theme: dark ? themes.dark : themes.light,
              },
            },
          };
        },
      }}>
      {children}
    </BaseContainer>
  );
};
