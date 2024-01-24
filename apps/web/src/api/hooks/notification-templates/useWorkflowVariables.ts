import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HandlebarHelpers } from '@novu/shared';

import { getWorkflowVariables } from '../../notification-templates';

export interface IVariable {
  label: string;
  detail: string;
  insertText: string;
}

const getTextToInsert = (text, key) => {
  if (key === 'translations') {
    return `i18n "${text}"`;
  }

  return text;
};

export const useWorkflowVariables = () => {
  const { data: variables = {}, ...rest } = useQuery(['getVariables'], getWorkflowVariables, {
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const allVariables: IVariable[] = useMemo(() => {
    const systemVars = Object.keys(variables)
      .map((key) => {
        const subVariables = variables[key];

        return Object.keys(subVariables)
          .map((name) => {
            const type = subVariables[name];
            if (typeof type === 'object') {
              return Object.keys(type).map((subName) => {
                return {
                  label: `${key === 'translations' ? 'i18n ' : ''}${name}.${subName}`,
                  detail: type[subName],
                  insertText: getTextToInsert(`${name}.${subName}`, key),
                };
              });
            }

            return {
              label: `${key === 'translations' ? 'i18n ' : ''}${name}`,
              detail: type,
              insertText: getTextToInsert(name, key),
            };
          })
          .flat();
      })
      .flat();

    return [
      ...Object.keys(HandlebarHelpers).map((name) => ({
        label: name,
        detail: HandlebarHelpers[name].description,
        insertText: name,
      })),
      ...systemVars,
    ];
  }, [variables]);

  return {
    variables,
    allVariables,
    ...rest,
  };
};
