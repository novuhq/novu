import { useMemo, useEffect, useRef, useState } from 'react';
import { JsonEditor } from 'json-edit-react';
import { cn } from '@/utils/ui';
import { Editor } from '@/components/primitives/editor';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import JSON5 from 'json5';
import {
  RiAddLine,
  RiEdit2Line,
  RiDeleteBin2Line,
  RiFileCopyLine,
  RiCheckLine,
  RiCloseLine,
  RiArrowDownSLine,
} from 'react-icons/ri';

type EditableJsonViewerProps = {
  value: any;
  onChange: (updatedData: any) => void;
  className?: string;
  schema?: any; // Optional JSON schema to detect enum fields
};

// Extensions for JSON editing
const jsonExtensions = [loadLanguage('json')?.extension ?? []];
const basicSetup = { lineNumbers: true, defaultKeymap: true };

// Custom theme for JsonEditor to match our design system
const customTheme = {
  container: {
    backgroundColor: 'transparent',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '12px',
    lineHeight: '1.5',
  },
  property: {
    color: 'hsl(var(--foreground-950))',
    fontWeight: '500',
  },
  bracket: {
    color: 'hsl(var(--neutral-600))',
    fontWeight: '600',
  },
  colon: {
    color: 'hsl(var(--neutral-600))',
  },
  comma: {
    color: 'hsl(var(--neutral-600))',
  },
  string: {
    color: 'hsl(var(--highlighted))',
  },
  number: {
    color: 'hsl(var(--information))',
  },
  boolean: {
    color: 'hsl(var(--feature))',
    fontWeight: '600',
  },
  null: {
    color: 'hsl(var(--neutral-400))',
    fontStyle: 'italic',
  },
  undefined: {
    color: 'hsl(var(--neutral-400))',
    fontStyle: 'italic',
  },
  editIcon: {
    color: 'hsl(var(--neutral-400))',
    '&:hover': {
      color: 'hsl(var(--feature))',
    },
  },
  addIcon: {
    color: 'hsl(var(--feature))',
    '&:hover': {
      color: 'hsl(var(--feature))',
      opacity: 0.8,
    },
  },
  deleteIcon: {
    color: 'hsl(var(--destructive))',
    '&:hover': {
      color: 'hsl(var(--destructive))',
      opacity: 0.8,
    },
  },
  collapseIcon: {
    color: 'hsl(var(--neutral-500))',
  },
  iconCollection: {
    backgroundColor: 'transparent',
  },
  input: {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--neutral-300))',
    borderRadius: '4px',
    padding: '2px 4px',
    fontSize: '12px',
    fontFamily: 'JetBrains Mono, monospace',
    color: 'hsl(var(--foreground-950))',
    '&:focus': {
      outline: 'none',
      borderColor: 'hsl(var(--feature))',
      boxShadow: '0 0 0 1px hsl(var(--feature))',
    },
  },
  select: {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--neutral-300))',
    borderRadius: '4px',
    padding: '2px 4px',
    fontSize: '12px',
    fontFamily: 'JetBrains Mono, monospace',
    color: 'hsl(var(--foreground-950))',
    '&:focus': {
      outline: 'none',
      borderColor: 'hsl(var(--feature))',
      boxShadow: '0 0 0 1px hsl(var(--feature))',
    },
  },
  error: {
    color: 'hsl(var(--destructive))',
    fontSize: '11px',
    marginTop: '2px',
  },
};

// Custom component for single-click editing
const SingleClickEditableValue = ({ value, setValue, setIsEditing, customNodeProps }) => {
  const { type } = customNodeProps || {};

  const handleClick = () => {
    setIsEditing(true);
  };

  // Render the value with single-click behavior
  const displayValue = type === 'string' ? `"${value}"` : String(value);

  return (
    <span
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        color:
          type === 'string'
            ? 'hsl(var(--highlighted))'
            : type === 'number'
              ? 'hsl(var(--information))'
              : type === 'boolean'
                ? 'hsl(var(--feature))'
                : 'inherit',
        fontWeight: type === 'boolean' ? '600' : 'normal',
      }}
      title="Click to edit"
    >
      {displayValue}
    </span>
  );
};

// Custom input component that auto-saves on blur
const AutoSaveInput = ({ value, onChange, onBlur, onKeyDown, type = 'text', ...props }) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    // Focus the input when it's created
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    onChange?.(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Auto-save on blur
    onBlur?.(e);
    // Trigger the save by simulating Enter key
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    onKeyDown?.(enterEvent as any);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      onKeyDown?.(e);
    }
  };

  return (
    <input
      ref={inputRef}
      type={type}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        backgroundColor: 'hsl(var(--background))',
        border: '1px solid hsl(var(--neutral-300))',
        borderRadius: '4px',
        padding: '2px 4px',
        fontSize: '12px',
        fontFamily: 'JetBrains Mono, monospace',
        color: 'hsl(var(--foreground-950))',
        outline: 'none',
        minWidth: '60px',
      }}
      {...props}
    />
  );
};

export function EditableJsonViewer({ value, onChange, className, schema }: EditableJsonViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Simple onChange handler that passes the updated data to the parent
  const handleChange = useMemo(
    () => (updatedData) => {
      console.log('updatedData', updatedData);
      onChange(updatedData.currentData);
    },
    [onChange]
  );

  // Custom JSON editor component using our existing Editor
  const CustomTextEditor = useMemo(
    () =>
      ({
        value,
        onChange,
        onKeyDown,
      }: {
        value: string;
        onChange: (value: string) => void;
        onKeyDown: (e: React.KeyboardEvent) => void;
      }) => {
        return (
          <Editor
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            lang="json"
            extensions={jsonExtensions}
            basicSetup={basicSetup}
            multiline
            className="min-h-[200px] overflow-auto rounded border border-neutral-300"
          />
        );
      },
    []
  );

  // Prepare the schema for json-edit-react if provided
  const editorSchema = useMemo(() => {
    if (!schema) return undefined;

    // json-edit-react expects the schema to match the data structure
    return schema;
  }, [schema]);

  // Custom node definitions for single-click editing with auto-save inputs
  const customNodeDefinitions = useMemo(
    () => [
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
    ],
    []
  );

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
      <JsonEditor
        data={value}
        onUpdate={handleChange}
        schema={editorSchema}
        theme={customTheme}
        TextEditor={CustomTextEditor}
        customNodeDefinitions={customNodeDefinitions}
        jsonParse={JSON5.parse}
        jsonStringify={(data) => JSON5.stringify(data, null, 2)}
        icons={{
          add: <RiAddLine className="size-3" />,
          edit: <RiEdit2Line className="size-3" />,
          delete: <RiDeleteBin2Line className="size-3" />,
          copy: <RiFileCopyLine className="size-3" />,
          ok: <RiCheckLine className="size-3" />,
          cancel: <RiCloseLine className="size-3" />,
          chevron: <RiArrowDownSLine className="size-3" />,
        }}
        collapse={3}
        showErrorMessages={true}
        showStringQuotes={true}
        showArrayIndices={false}
        showObjectSize={false}
        enableClipboard={true}
        editable={true}
        restrictEdit={false}
        restrictDelete
        restrictAdd
        searchFilter={false}
        showCollectionCount={false}
        defaultValue={undefined}
        restrictTypeSelection
        collapseAnimationTime={100}
      />
    </div>
  );
}
