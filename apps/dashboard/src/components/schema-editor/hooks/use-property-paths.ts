import { useMemo } from 'react';
import type { Path } from 'react-hook-form';

import type { SchemaEditorFormValues } from '../utils/validation-schema';

export function usePropertyPaths(pathPrefix: Path<SchemaEditorFormValues>) {
  return useMemo(
    () => ({
      definition: `${pathPrefix}.definition` as Path<SchemaEditorFormValues>,
      keyName: `${pathPrefix}.keyName` as Path<SchemaEditorFormValues>,
      isRequired: `${pathPrefix}.isRequired` as Path<SchemaEditorFormValues>,
      isNullable: `${pathPrefix}.isNullable` as Path<SchemaEditorFormValues>,
      enum: `${pathPrefix}.definition.enum` as Path<SchemaEditorFormValues>,
      nestedPropertyList: `${pathPrefix}.definition.propertyList` as Path<SchemaEditorFormValues>,
      itemSchemaObject: `${pathPrefix}.definition.items`,
      itemPropertiesList: `${pathPrefix}.definition.items.propertyList`,
    }),
    [pathPrefix]
  );
}
