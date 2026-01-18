import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { CustomNodeDefinition, JsonEditor, UpdateFunctionProps } from 'json-edit-react';
import JSON5 from 'json5';
import { useEffect, useMemo, useRef, useState } from 'react';
import { InlineToast } from '@/components/primitives/inline-toast';
import { cn } from '@/utils/ui';
import { CUSTOM_THEME } from './constants';
import { CustomTextEditor } from './custom-text-editor';
import { JSON_EDITOR_ICONS } from './icons';
import { SingleClickEditableValue } from './single-click-editable-value';
import { EditableJsonViewerProps } from './types';
import { useHideRootNode } from './use-hide-root-node';

/**
 * EditableJsonViewer - A JSON editor component with optional schema validation
 *
 * Features:
 * - Interactive JSON editing with syntax highlighting
 * - Optional JSON Schema validation using AJV
 * - Real-time validation with error display
 * - Custom node definitions for enhanced editing experience
 *
 * @param value - The JSON data to edit
 * @param onChange - Callback when data changes (only called with valid data if schema provided)
 * @param className - Additional CSS classes
 * @param schema - Optional JSON Schema for validation (JSONSchema7 format)
 * @param isReadOnly - When true, disables all editing functionality
 */
export function EditableJsonViewer({
  value,
  onChange,
  className,
  schema,
  isReadOnly = false,
}: EditableJsonViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const ajvValidator = useMemo(() => {
    if (!schema) return null;

    const ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false, // Allow unknown keywords like "example"
      strictSchema: false, // Allow schema keywords that are not in the spec
    });
    addFormats(ajv);

    try {
      return ajv.compile(schema);
    } catch (error) {
      console.warn('Failed to compile JSON schema:', error);
      return null;
    }
  }, [schema]);

  const validateData = useMemo(
    () => (data: any) => {
      if (!ajvValidator) {
        setValidationErrors([]);
        return true;
      }

      const isValid = ajvValidator(data);

      if (isValid) {
        setValidationErrors([]);
        return true;
      }

      const errorMessages = ajvValidator.errors?.map((error) => {
        const path = error.instancePath ? `${error.instancePath}: ` : '';

        return `${path}${error.message}`;
      }) || ['Validation failed'];

      setValidationErrors(errorMessages);
      return false;
    },
    [ajvValidator]
  );

  useEffect(() => {
    if (value !== undefined) {
      validateData(value);
    }
  }, [value, validateData]);

  const handleUpdate = useMemo(
    () => (updatedData: UpdateFunctionProps) => {
      validateData(updatedData.newData);
      onChange(updatedData.newData);
    },
    [onChange, validateData]
  );

  const handleError = useMemo(
    () => (errorData: any) => {
      const { error, path } = errorData;
      const pathString = Array.isArray(path) ? path.join('.') : path || '';
      const errorMessage = pathString ? `${pathString}: ${error.message}` : error.message;

      setValidationErrors([errorMessage]);
    },
    []
  );

  useHideRootNode(containerRef, value);

  const customNodeDefinitions = useMemo(() => {
    // Don't show custom editable components in read-only mode
    if (isReadOnly) {
      return [];
    }

    const components: CustomNodeDefinition<Record<string, any>, Record<string, any>>[] = [
      {
        condition: ({ value }) => typeof value === 'string',
        element: SingleClickEditableValue,
        showOnView: true,
        showOnEdit: false,
        customNodeProps: { type: 'string' },
      },
      {
        condition: ({ value }) => typeof value === 'number',
        element: SingleClickEditableValue,
        showOnView: true,
        showOnEdit: false,
        customNodeProps: { type: 'number' },
      },
      {
        condition: ({ value }) => typeof value === 'boolean',
        element: SingleClickEditableValue,
        showOnView: true,
        showOnEdit: false,
        customNodeProps: { type: 'boolean' },
      },
    ];

    return components;
  }, [isReadOnly]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'border-neutral-alpha-200 bg-background text-foreground-600',
        'mx-0 mt-0 rounded-lg border border-dashed',
        'max-h-[400px] min-h-[100px] overflow-hidden',
        'font-mono text-xs',
        'flex flex-col',
        isReadOnly && 'pointer-events-none',
        className
      )}
    >
      {validationErrors.length > 0 && (
        <div className="p-1.5 pb-0 shrink-0">
          <InlineToast
            variant="error"
            title={`Payload validation issue${validationErrors.length > 1 ? 's' : ''}`}
            description={
              <ul>
                {validationErrors.map((error, index) => (
                  <li key={index} className="leading-[18px]">
                    - {error}
                  </li>
                ))}
              </ul>
            }
            className="bg-bg-weak border-stroke-soft mb-2"
          />
        </div>
      )}
      <div
        className={cn(
          'flex-1 overflow-auto overflow-x-auto scrollbar-thin',
          'mask-[linear-gradient(to_right,black_calc(100%-1.5rem),transparent)]',
          'mask-size-[100%_100%]',
          'mask-no-repeat'
        )}
      >
        <JsonEditor
          data={value}
          onUpdate={handleUpdate}
          onError={handleError}
          theme={CUSTOM_THEME}
          TextEditor={CustomTextEditor}
          customNodeDefinitions={customNodeDefinitions}
          jsonParse={JSON5.parse}
          jsonStringify={(data) => JSON5.stringify(data, null, 2)}
          icons={JSON_EDITOR_ICONS}
          showErrorMessages={false}
          showStringQuotes={true}
          showCollectionCount={!isReadOnly}
          showArrayIndices={false}
          enableClipboard={!isReadOnly}
          restrictEdit={isReadOnly}
          restrictDelete
          restrictAdd
          rootName={'nv-root-node'}
          defaultValue={undefined}
          restrictTypeSelection
          collapseAnimationTime={100}
        />
      </div>
    </div>
  );
}

export type { EditableJsonViewerProps } from './types';
