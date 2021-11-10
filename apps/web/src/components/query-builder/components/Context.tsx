import React, { createContext } from 'react';
import { Strings, strings as defaultStrings } from '../constants/strings';
import { BuilderComponentsProps, BuilderFieldProps, defaultComponents } from './Builder';
/* eslint react/prop-types: 0 */
export interface BuilderContextProps {
  fields: BuilderFieldProps[];
  data: any;
  readOnly: boolean;
  components: BuilderComponentsProps;
  strings: Strings;
  setData: React.Dispatch<any>;
  onChange?: (data: any) => void;
}

export const BuilderContext = createContext<BuilderContextProps>(
  // tslint:disable-next-line: no-object-literal-type-assertion
  {} as BuilderContextProps
);

export interface BuilderContextProviderProps extends BuilderContextProps {
  children: React.ReactNode | React.ReactNodeArray;
}

export const BuilderContextProvider: React.FC<BuilderContextProviderProps> = ({
  fields,
  components,
  strings,
  data,
  readOnly,
  setData,
  onChange,
  children,
}) => {
  // eslint-disable-next-line no-param-reassign
  components = {
    ...defaultComponents,
    ...components,
    form: { ...defaultComponents.form, ...components.form },
  };

  // eslint-disable-next-line no-param-reassign
  strings = {
    ...defaultStrings,
    ...strings,
    component: {
      ...defaultStrings.component,
      ...strings.component,
    },
    form: {
      ...defaultStrings.form,
      ...strings.form,
    },
    group: {
      ...defaultStrings.group,
      ...strings.group,
    },
    operators: {
      ...defaultStrings.operators,
      ...strings.operators,
    },
  };

  return (
    <BuilderContext.Provider
      value={{
        fields,
        components,
        strings,
        data,
        readOnly,
        setData,
        onChange,
      }}>
      {children}
    </BuilderContext.Provider>
  );
};
