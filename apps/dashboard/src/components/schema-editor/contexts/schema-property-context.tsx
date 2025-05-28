import { createContext, useContext, type PropsWithChildren } from 'react';
import type { Control, UseFormGetValues, UseFormSetValue } from 'react-hook-form';

import type { SchemaEditorFormValues } from '../utils/validation-schema';
import type { VariableUsageInfo } from '../utils/check-variable-usage';

interface SchemaPropertyContextValue {
  control: Control<SchemaEditorFormValues>;
  setValue: UseFormSetValue<SchemaEditorFormValues>;
  getValues: UseFormGetValues<SchemaEditorFormValues>;
  onCheckVariableUsage?: (keyName: string, parentPath: string) => VariableUsageInfo;
}

const SchemaPropertyContext = createContext<SchemaPropertyContextValue | undefined>(undefined);

export function SchemaPropertyProvider({ children, ...value }: PropsWithChildren<SchemaPropertyContextValue>) {
  return <SchemaPropertyContext.Provider value={value}>{children}</SchemaPropertyContext.Provider>;
}

export function useSchemaPropertyContext() {
  const context = useContext(SchemaPropertyContext);

  if (!context) {
    throw new Error('useSchemaPropertyContext must be used within SchemaPropertyProvider');
  }

  return context;
}
