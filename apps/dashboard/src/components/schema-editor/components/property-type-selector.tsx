import { useCallback, useMemo } from 'react';
import type { Control, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { SCHEMA_TYPE_OPTIONS } from '../constants';
import { useSchemaPropertyType } from '../hooks/use-schema-property-type';
import type { JSONSchema7, JSONSchema7TypeName } from '../json-schema';
import {
  ensureArray,
  ensureBoolean,
  ensureEnum,
  ensureNull,
  ensureNumberOrInteger,
  ensureObject,
  ensureString,
} from '../utils/json-helpers';

type PropertyTypeSelectorProps = {
  definitionPath: string;
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  getValues: UseFormGetValues<any>;
  isDisabled?: boolean;
};

export function PropertyTypeSelector({
  definitionPath,
  control,
  setValue,
  getValues,
  isDisabled = false,
}: PropertyTypeSelectorProps) {
  const currentDefinition = useWatch({ control, name: definitionPath }) as JSONSchema7 | undefined;

  const currentType = useSchemaPropertyType(currentDefinition);

  const handleTypeChange = useCallback(
    (newSchemaType: JSONSchema7TypeName | 'enum') => {
      const currentDef = (getValues(definitionPath) as JSONSchema7) || {};

      let newTransformedSchema: JSONSchema7;

      if (newSchemaType === 'enum') {
        newTransformedSchema = ensureEnum(currentDef);
      } else if (newSchemaType === 'array') {
        newTransformedSchema = ensureArray(currentDef);
      } else if (newSchemaType === 'object') {
        newTransformedSchema = ensureObject(currentDef);
      } else if (newSchemaType === 'string') {
        newTransformedSchema = ensureString(currentDef);
      } else if (newSchemaType === 'number' || newSchemaType === 'integer') {
        newTransformedSchema = ensureNumberOrInteger(currentDef, newSchemaType);
      } else if (newSchemaType === 'boolean') {
        newTransformedSchema = ensureBoolean(currentDef);
      } else if (newSchemaType === 'null') {
        newTransformedSchema = ensureNull(currentDef);
      } else {
        newTransformedSchema = { ...currentDef, type: newSchemaType as JSONSchema7TypeName };
        delete (newTransformedSchema as any).propertyList;
        delete newTransformedSchema.items;
        delete newTransformedSchema.enum;
      }

      setValue(definitionPath, newTransformedSchema, { shouldValidate: true, shouldDirty: true });
    },
    [getValues, setValue, definitionPath]
  );

  return (
    <Select
      value={currentType || ''}
      onValueChange={(newTypeValue) => {
        handleTypeChange(newTypeValue as JSONSchema7TypeName | 'enum');
      }}
      disabled={isDisabled}
    >
      <SelectTrigger className="w-[120px] text-sm" size="2xs">
        <SelectValue placeholder="Select type" />
      </SelectTrigger>
      <SelectContent>
        {SCHEMA_TYPE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-sm">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
