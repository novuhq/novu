import { GetContextResponseDto } from '@novu/api/models/components';
import { ContextPayload } from '@novu/shared';
import { JSONSchema7 } from 'json-schema';
import { useCallback, useState } from 'react';
import { useFetchContexts } from '@/hooks/use-fetch-contexts';
import { Autocomplete } from './primitives/autocomplete';
import { ACCORDION_STYLES } from './workflow-editor/steps/constants/preview-context.constants';
import { EditableJsonViewer } from './workflow-editor/steps/shared/editable-json-viewer/editable-json-viewer';

type ContextSearchEditorProps = {
  value: unknown;
  onUpdate: (updatedData: ContextPayload) => void;
  schema?: JSONSchema7;
  error?: string;
};

export function ContextSearchEditor({ value, onUpdate, schema, error }: ContextSearchEditorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: contextsData, isLoading } = useFetchContexts({
    limit: 20,
    search: searchQuery.length >= 2 ? searchQuery : undefined,
  });
  const contexts = contextsData?.data || [];

  const displayValue = value || {};

  const handleSelectContext = useCallback(
    (selectedContext: GetContextResponseDto) => {
      // Add the selected context to the existing context structure by its type
      const currentContext = value || {};
      const updatedContext = {
        ...currentContext,
        [selectedContext.type]: {
          id: selectedContext.id,
          data: selectedContext.data || {},
        },
      };
      onUpdate(updatedContext);
      setSearchQuery('');
    },
    [onUpdate, value]
  );

  const handleContextChange = useCallback(
    (updatedData: unknown) => {
      onUpdate(updatedData || {});
    },
    [onUpdate]
  );

  return (
    <div className="flex flex-col gap-2">
      <Autocomplete
        value={searchQuery}
        onChange={setSearchQuery}
        items={contexts.map((context) => ({ ...context, id: `${context.type}:${context.id}` }))}
        isLoading={isLoading}
        hasSearched={searchQuery.length >= 2}
        onSelectItem={(item) => {
          const originalContext = contexts.find((c) => `${c.type}:${c.id}` === item.id);
          if (originalContext) {
            handleSelectContext(originalContext);
          }
        }}
        size="xs"
        placeholder="Search contexts by type or ID..."
        sectionTitle="Contexts"
        emptyStateTitle="No contexts found"
        emptyStateDescription="Try a different search term"
        renderItem={(item) => {
          const originalContext = contexts.find((c) => `${c.type}:${c.id}` === item.id);
          if (!originalContext) return null;

          return (
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-medium">{originalContext.id}</span>
                <span className="text-xs text-foreground-400">({originalContext.type})</span>
              </div>
              {originalContext.data && Object.keys(originalContext.data).length > 0 && (
                <span className="text-xs text-foreground-400">{Object.keys(originalContext.data).join(', ')}</span>
              )}
            </div>
          );
        }}
      />
      <div className="flex flex-1 flex-col gap-2 overflow-auto">
        <EditableJsonViewer
          value={displayValue}
          onChange={handleContextChange}
          className={ACCORDION_STYLES.jsonViewer}
          schema={schema}
        />
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
    </div>
  );
}
