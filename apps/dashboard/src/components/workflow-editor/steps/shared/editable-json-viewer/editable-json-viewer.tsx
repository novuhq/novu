import { useMemo, useEffect, useRef, useState } from 'react';
import { CustomNodeDefinition, JsonEditor, UpdateFunctionProps } from 'json-edit-react';
import { cn } from '@/utils/ui';
import JSON5 from 'json5';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import { EditableJsonViewerProps } from './types';
import { CUSTOM_THEME } from './constants';
import { SingleClickEditableValue } from './single-click-editable-value';
import { CustomTextEditor } from './custom-text-editor';
import { useHideRootNode } from './use-hide-root-node';
import { JSON_EDITOR_ICONS } from './icons';

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
 */
export function EditableJsonViewer({ value, onChange, className, schema }: EditableJsonViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number>(0);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const ajvValidator = useMemo(() => {
    if (!schema) return null;

    const ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajv);

    try {
      return ajv.compile(schema);
    } catch (error) {
      console.warn('Failed to compile JSON schema:', error);
      return null;
    }
  }, [schema]);

  // Auto-hide errors after 5 seconds with countdown
  useEffect(() => {
    if (validationErrors.length > 0) {
      setCountdown(5);
      setIsExiting(false);

      // Clear any existing timers
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }

          return prev - 1;
        });
      }, 1000);

      // Start exit animation after 4 seconds, then hide after 5 seconds
      timerRef.current = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setValidationErrors([]);
          setCountdown(0);
          setIsExiting(false);
        }, 300); // Animation duration
      }, 4000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [validationErrors.length]);

  const dismissErrors = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setIsExiting(true);
    setTimeout(() => {
      setValidationErrors([]);
      setCountdown(0);
      setIsExiting(false);
    }, 300);
  };

  const handleUpdate = useMemo(
    () => (updatedData: UpdateFunctionProps) => {
      if (ajvValidator) {
        const isValid = ajvValidator(updatedData.newData);

        if (isValid) {
          setValidationErrors([]);
          onChange(updatedData.newData);
        } else {
          const errorMessages = ajvValidator.errors?.map((error) => {
            const path = error.instancePath ? `${error.instancePath}: ` : '';
            return `${path}${error.message}`;
          }) || ['Validation failed'];

          setValidationErrors(errorMessages);
          console.warn('Validation failed:', errorMessages);

          // Return the error string for json-edit-react to handle
          return errorMessages.join('\n');
        }
      } else {
        setValidationErrors([]);
        onChange(updatedData.newData);
      }
    },
    [onChange, ajvValidator]
  );

  const handleError = useMemo(
    () => (errorData: any) => {
      // Handle editor errors (JSON parsing, duplicate keys, etc.)
      const { error, path } = errorData;
      const pathString = Array.isArray(path) ? path.join('.') : path || '';
      const errorMessage = pathString ? `${pathString}: ${error.message}` : error.message;

      setValidationErrors([errorMessage]);
      console.warn('Editor error:', error);
    },
    []
  );

  useHideRootNode(containerRef);

  const customNodeDefinitions = useMemo(() => {
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
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'border-neutral-alpha-200 bg-background text-foreground-600',
        'mx-0 mt-0 rounded-lg border border-dashed',
        'max-h-[400px] min-h-[100px] overflow-auto',
        'font-mono text-xs',
        className
      )}
    >
      {validationErrors.length > 0 && (
        <div className="p-1.5">
          <div
            className={cn(
              'border-destructive bg-destructive/10 text-destructive mb-2 rounded border p-2 text-xs transition-all duration-300 ease-in-out',
              isExiting ? 'translate-y-[-4px] scale-95 opacity-0' : 'translate-y-0 scale-100 opacity-100'
            )}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium">Validation Error{validationErrors.length > 1 ? 's' : ''}</span>
              <div className="flex items-center gap-2">
                {countdown > 0 && (
                  <div className="flex items-center gap-1 text-xs opacity-70">
                    <div className="flex h-3 w-3 items-center justify-center rounded-full border border-current">
                      <span className="text-[10px] leading-none">{countdown}</span>
                    </div>
                    <span>Auto-hide</span>
                  </div>
                )}
                <button
                  onClick={dismissErrors}
                  type="button"
                  className="hover:bg-destructive/20 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
                  aria-label="Dismiss errors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {validationErrors.map((error, index) => (
              <div key={index} className="mt-1 first:mt-0">
                {error}
              </div>
            ))}
          </div>
        </div>
      )}
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
        showArrayIndices={false}
        enableClipboard={true}
        restrictEdit={false}
        restrictDelete
        restrictAdd
        rootName={'nv-root-node'}
        showCollectionCount={false}
        defaultValue={undefined}
        restrictTypeSelection
        collapseAnimationTime={100}
        schema={schema}
      />
    </div>
  );
}

export type { EditableJsonViewerProps } from './types';
