import { useMemo, useEffect, useRef, useState } from 'react';
import { CustomNodeDefinition, JsonEditor } from 'json-edit-react';
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
const SingleClickEditableValue = ({
  value,
  setValue,
  setIsEditing,
  customNodeProps,
}: {
  value: any;
  setValue?: (value: any) => void;
  setIsEditing?: (editing: boolean) => void;
  customNodeProps?: { type?: string };
}) => {
  const { type } = customNodeProps || {};

  const handleClick = () => {
    setIsEditing?.(true);
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

export function EditableJsonViewer({ value, onChange, className, schema }: EditableJsonViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentEditPath, setCurrentEditPath] = useState<string[] | null>(null);
  const [externalTriggers, setExternalTriggers] = useState<any>({});
  const clickListenerRef = useRef<((event: MouseEvent) => void) | null>(null);

  // Handle when editing is complete (blur, enter, etc.)
  const handleUpdate = useMemo(
    () => (updatedData: { newData: any }) => {
      onChange(updatedData.newData);
    },
    [onChange]
  );

  // Track when editing starts/stops
  const handleEditEvent = useMemo(
    () => (path: string | (string | number)[] | null) => {
      const normalizedPath = Array.isArray(path) ? path.map(String) : path ? [String(path)] : null;
      setCurrentEditPath(normalizedPath);
    },
    []
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

  // Handle clicks outside the editor to auto-save
  useEffect(() => {
    // Clean up any existing listener
    if (clickListenerRef.current) {
      document.removeEventListener('mousedown', clickListenerRef.current);
      clickListenerRef.current = null;
    }

    if (currentEditPath) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;

        // Check if the click is outside the container
        if (containerRef.current && !containerRef.current.contains(target)) {
          console.log('Click outside detected, triggering save for path:', currentEditPath);
          setExternalTriggers({
            edit: {
              action: 'accept',
            },
          });
          return;
        }

        // Check if the click is on a different editable element within the container
        // This handles clicks on other fields in nested objects
        const clickedElement = target as HTMLElement;
        const isClickOnInput = clickedElement.matches('input, textarea, .jer-key-text, .jer-value');
        const isClickOnEditableValue = clickedElement.closest('.jer-value-node, .jer-function-value-node');
        const isClickOnButton = clickedElement.closest('button, .jer-plus-menu, .jer-minus-menu');

        if (isClickOnInput || isClickOnEditableValue || isClickOnButton) {
          // Check if this is a different field than the one currently being edited
          const currentlyEditingElement = containerRef.current?.querySelector('input:focus, textarea:focus');

          if (
            currentlyEditingElement &&
            !currentlyEditingElement.contains(target) &&
            currentlyEditingElement !== target
          ) {
            console.log('Click on different field detected, triggering save for path:', currentEditPath);
            setExternalTriggers({
              edit: {
                action: 'accept',
              },
            });
          }
        }
      };

      clickListenerRef.current = handleClickOutside;
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup function
    return () => {
      if (clickListenerRef.current) {
        document.removeEventListener('mousedown', clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [currentEditPath]);

  // Reset external triggers after they've been processed
  useEffect(() => {
    if (externalTriggers.edit) {
      const timer = setTimeout(() => {
        setExternalTriggers({});
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [externalTriggers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clickListenerRef.current) {
        document.removeEventListener('mousedown', clickListenerRef.current);
      }
    };
  }, []);

  // Hide the root node name
  useEffect(() => {
    const hideRootNodeName = () => {
      const keyTextElements = containerRef.current?.querySelectorAll('.jer-key-text');
      keyTextElements?.forEach((element) => {
        if (element.textContent?.includes('nv-root-node')) {
          (element as HTMLElement).style.display = 'none';
        }
      });
    };

    // Run after component mounts and updates
    const timer = setTimeout(hideRootNodeName, 0);
    return () => clearTimeout(timer);
  });

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
        onUpdate={handleUpdate}
        onEditEvent={handleEditEvent}
        externalTriggers={externalTriggers}
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
        showErrorMessages={true}
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
      />
    </div>
  );
}
