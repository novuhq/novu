import { memo } from 'react';
import type { Path, Control } from 'react-hook-form';

import type { SchemaEditorFormValues } from '../utils/validation-schema';
import type { VariableUsageInfo } from '../utils/check-variable-usage';
import { SchemaPropertyRow } from '../schema-property-row';

interface RecursivePropertyRowProps {
  control: Control<SchemaEditorFormValues>;
  index: number;
  pathPrefix: Path<SchemaEditorFormValues>;
  onDeleteProperty: () => void;
  indentationLevel?: number;
  parentPath?: string;
  variableUsageInfo?: VariableUsageInfo;
  onCheckVariableUsage?: (keyName: string, parentPath: string) => VariableUsageInfo;
}

export const RecursivePropertyRow = memo<RecursivePropertyRowProps>(function RecursivePropertyRow(props) {
  return <SchemaPropertyRow {...props} />;
});
