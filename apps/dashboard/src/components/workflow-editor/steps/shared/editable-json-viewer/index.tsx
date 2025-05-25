import { useMemo, useEffect, useRef, useState } from 'react';
import { CustomNodeDefinition, JsonEditor, UpdateFunctionProps } from 'json-edit-react';
import { cn } from '@/utils/ui';
import JSON5 from 'json5';

import { EditableJsonViewerProps } from './types';
import { CUSTOM_THEME } from './constants';
import { SingleClickEditableValue } from './single-click-editable-value';
import { CustomTextEditor } from './custom-text-editor';
import { useHideRootNode } from './use-hide-root-node';
import { JSON_EDITOR_ICONS } from './icons';

export function EditableJsonViewer({ value, onChange, className }: EditableJsonViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleUpdate = useMemo(
    () => (updatedData: UpdateFunctionProps) => {
      onChange(updatedData.newData);
    },
    [onChange]
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
      <JsonEditor
        data={value}
        onUpdate={handleUpdate}
        theme={CUSTOM_THEME}
        TextEditor={CustomTextEditor}
        customNodeDefinitions={customNodeDefinitions}
        jsonParse={JSON5.parse}
        jsonStringify={(data) => JSON5.stringify(data, null, 2)}
        icons={JSON_EDITOR_ICONS}
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

export type { EditableJsonViewerProps } from './types';
