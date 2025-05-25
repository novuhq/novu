import { Code2 } from '@/components/icons/code-2';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Button } from '@/components/primitives/button';
import { Editor } from '@/components/primitives/editor';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { CSSProperties, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { JsonViewer, defineDataType } from '@textea/json-viewer';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { cn } from '@/utils/ui';

const extensions = [loadLanguage('json')?.extension ?? []];

// Custom theme for JsonViewer to match our design system
const jsonViewerTheme = {
  backgroundColor: 'transparent',

  // Color scheme matching our design tokens
  base00: 'hsl(var(--background))', // background
  base01: 'hsl(var(--neutral-100))', // lighter background
  base02: 'hsl(var(--neutral-200))', // selection background
  base03: 'hsl(var(--neutral-400))', // comments, invisibles
  base04: 'hsl(var(--neutral-500))', // dark foreground
  base05: 'hsl(var(--foreground-950))', // default foreground
  base06: 'hsl(var(--foreground-800))', // light foreground
  base07: 'hsl(var(--foreground-600))', // lightest foreground
  base08: 'hsl(var(--destructive))', // variables, XML tags
  base09: 'hsl(var(--information))', // integers, boolean, constants
  base0A: 'hsl(var(--warning))', // classes, markup bold
  base0B: 'hsl(var(--highlighted))', // strings, inherited class
  base0C: 'hsl(var(--information))', // support, regular expressions
  base0D: 'hsl(var(--feature))', // functions, methods
  base0E: 'hsl(var(--feature))', // keywords, storage
  base0F: 'hsl(var(--neutral-600))', // deprecated, opening/closing tags
};

type ConfigurePreviewAccordionProps = {
  editorValue: string;
  setEditorValue: (value: string) => Error | null;
  onUpdate: () => void;
};

export const ConfigurePreviewAccordion = ({
  editorValue,
  setEditorValue,
  onUpdate,
}: ConfigurePreviewAccordionProps) => {
  const [accordionValue, setAccordionValue] = useState<string | undefined>('payload');
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [height, setHeight] = useState(0);
  const [jsonData, setJsonData] = useState<any>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const isPayloadSchemaEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_PAYLOAD_SCHEMA_ENABLED);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect();
        setHeight(rect.height);
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [editorValue, jsonData]);

  // Parse JSON data for JsonViewer
  useEffect(() => {
    if (isPayloadSchemaEnabled) {
      try {
        const parsed = JSON.parse(editorValue || '{}');
        setJsonData(parsed);
        setPayloadError(null);
      } catch (error) {
        setPayloadError('Invalid JSON format');
      }
    }
  }, [editorValue, isPayloadSchemaEnabled]);

  const setEditorValueCallback = useCallback(
    (value: string) => {
      const error = setEditorValue(value);

      if (error) {
        setPayloadError(error.message);
      } else {
        setPayloadError(null);
      }
    },
    [setEditorValue]
  );

  const handleJsonChange = useCallback(
    (path: (string | number)[], currentValue: any, newValue: any) => {
      try {
        // Create a deep copy of the current data
        const updatedData = JSON.parse(JSON.stringify(jsonData));

        // Navigate to the correct path and update the value
        let current = updatedData;

        for (let i = 0; i < path.length - 1; i++) {
          current = current[path[i]];
        }

        if (path.length > 0) {
          current[path[path.length - 1]] = newValue;
        } else {
          // Root level change
          Object.assign(updatedData, newValue);
        }

        const stringified = JSON.stringify(updatedData, null, 2);
        setEditorValueCallback(stringified);
        setJsonData(updatedData);
      } catch (error) {
        setPayloadError('Failed to update JSON');
      }
    },
    [jsonData, setEditorValueCallback]
  );

  // Create custom data types with the onChange handler bound
  const createEditableTypes = useCallback((onChange: typeof handleJsonChange) => {
    // Custom editable string type that's directly clickable
    const editableStringType = defineDataType({
      is: (value: unknown): value is string => typeof value === 'string',
      Component: (props) => {
        const { value, path } = props;
        const [isEditing, setIsEditing] = useState(false);
        const [editValue, setEditValue] = useState(value as string);
        const inputRef = useRef<HTMLInputElement>(null);

        useEffect(() => {
          if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
          }
        }, [isEditing]);

        const handleSave = useCallback(() => {
          if (editValue !== value) {
            onChange(path, value, editValue);
          }

          setIsEditing(false);
        }, [editValue, value, onChange, path]);

        // Handle click outside to save
        useEffect(() => {
          if (!isEditing) return;

          const handleClickOutside = (event: MouseEvent) => {
            if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
              handleSave();
            }
          };

          document.addEventListener('mousedown', handleClickOutside);

          return () => {
            document.removeEventListener('mousedown', handleClickOutside);
          };
        }, [isEditing, handleSave]);

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditValue(value as string);
            setIsEditing(false);
          }
        };

        if (isEditing) {
          return (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="bg-background focus:ring-feature min-w-[60px] rounded border border-neutral-300 px-1 py-0.5 font-mono text-xs focus:outline-none focus:ring-1"
              style={{
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          );
        }

        return (
          <span
            onClick={() => setIsEditing(true)}
            className="cursor-pointer rounded px-1 py-0.5 transition-colors hover:bg-neutral-100"
            style={{
              color: 'hsl(var(--highlighted))',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            title="Click to edit"
          >
            "{value as string}"
          </span>
        );
      },
    });

    // Custom editable number type
    const editableNumberType = defineDataType({
      is: (value: unknown): value is number => typeof value === 'number',
      Component: (props) => {
        const { value, path } = props;
        const [isEditing, setIsEditing] = useState(false);
        const [editValue, setEditValue] = useState((value as number).toString());
        const inputRef = useRef<HTMLInputElement>(null);

        useEffect(() => {
          if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
          }
        }, [isEditing]);

        const handleSave = useCallback(() => {
          const numValue = parseFloat(editValue);

          if (!isNaN(numValue) && numValue !== value) {
            onChange(path, value, numValue);
          }

          setIsEditing(false);
        }, [editValue, value, onChange, path]);

        // Handle click outside to save
        useEffect(() => {
          if (!isEditing) return;

          const handleClickOutside = (event: MouseEvent) => {
            if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
              handleSave();
            }
          };

          document.addEventListener('mousedown', handleClickOutside);

          return () => {
            document.removeEventListener('mousedown', handleClickOutside);
          };
        }, [isEditing, handleSave]);

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditValue((value as number).toString());
            setIsEditing(false);
          }
        };

        if (isEditing) {
          return (
            <input
              ref={inputRef}
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="bg-background focus:ring-feature min-w-[60px] rounded border border-neutral-300 px-1 py-0.5 font-mono text-xs focus:outline-none focus:ring-1"
              style={{
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          );
        }

        return (
          <span
            onClick={() => setIsEditing(true)}
            className="cursor-pointer rounded px-1 py-0.5 transition-colors hover:bg-neutral-100"
            style={{
              color: 'hsl(var(--information))',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            title="Click to edit"
          >
            {value as number}
          </span>
        );
      },
    });

    // Custom editable boolean type
    const editableBooleanType = defineDataType({
      is: (value: unknown): value is boolean => typeof value === 'boolean',
      Component: (props: any) => {
        const { value, path } = props;

        const handleClick = () => {
          const newValue = !(value as boolean);
          onChange(path, value, newValue);
        };

        return (
          <span
            onClick={handleClick}
            className="cursor-pointer rounded px-1 py-0.5 transition-colors hover:bg-neutral-100"
            style={{
              color: 'hsl(var(--feature))',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            title="Click to toggle"
          >
            {(value as boolean).toString()}
          </span>
        );
      },
    });

    return [editableStringType, editableNumberType, editableBooleanType];
  }, []);

  // Create the editable types with the onChange handler
  const editableTypes = useMemo(() => createEditableTypes(handleJsonChange), [createEditableTypes, handleJsonChange]);

  return (
    <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue}>
      <AccordionItem value="payload">
        <AccordionTrigger>
          <div className="flex items-center gap-1">
            <Code2 className="text-feature size-3" />
            Configure preview
          </div>
        </AccordionTrigger>
        <AccordionContent
          ref={contentRef}
          className="flex flex-col gap-2"
          style={{ '--radix-collapsible-content-height': `${height}px` } as CSSProperties}
        >
          {isPayloadSchemaEnabled ? (
            <div
              className={cn(
                'border-neutral-alpha-200 bg-background text-foreground-600',
                'mx-0 mt-0 rounded-lg border border-dashed p-3',
                'max-h-[400px] min-h-[100px] overflow-auto',
                'font-mono text-xs'
              )}
            >
              <JsonViewer
                value={jsonData}
                onChange={handleJsonChange}
                displayDataTypes={false}
                defaultInspectDepth={3}
                theme={jsonViewerTheme}
                valueTypes={editableTypes}
                style={{
                  fontSize: '12px',
                  lineHeight: '1.5',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
            </div>
          ) : (
            <Editor
              value={editorValue}
              onChange={setEditorValueCallback}
              lang="json"
              extensions={extensions}
              multiline
              className="border-neutral-alpha-200 bg-background text-foreground-600 mx-0 mt-0 rounded-lg border border-dashed p-3"
            />
          )}
          {payloadError && <p className="text-destructive text-xs">{payloadError}</p>}
          <div className="flex justify-end gap-1">
            <Button
              size="2xs"
              type="button"
              variant="secondary"
              mode="outline"
              className="self-end"
              onClick={() => {
                setEditorValueCallback('{}');

                if (isPayloadSchemaEnabled) {
                  setJsonData({});
                }

                onUpdate();
              }}
            >
              Reset
            </Button>
            <Button
              size="2xs"
              type="button"
              variant="primary"
              mode="outline"
              className="self-end"
              disabled={payloadError !== null}
              onClick={onUpdate}
            >
              Apply
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
