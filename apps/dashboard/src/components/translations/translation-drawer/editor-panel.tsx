import { RiFileTextLine } from 'react-icons/ri';
import { Skeleton } from '@/components/primitives/skeleton';
import { Editor } from '@/components/primitives/editor';
import { cn } from '@/utils/ui';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { DATE_FORMAT_OPTIONS, TIME_FORMAT_OPTIONS } from '../constants';
import { formatTranslationDate, formatTranslationTime } from '../utils';
import { EditorActions } from './editor-actions';
import { TranslationResource } from './types';

type JSONEditorProps = {
  content: string;
  onChange: (value: string) => void;
  error: string | null;
  updatedAt: string;
};

function JSONEditor({ content, onChange, error, updatedAt }: JSONEditorProps) {
  return (
    <div className="flex-1 px-3 pb-3">
      <div
        className={cn(
          'relative h-[calc(100%-10rem)] rounded-lg border bg-white p-4',
          error ? 'border-red-300' : 'border-neutral-200'
        )}
      >
        <Editor
          value={content}
          onChange={onChange}
          lang="json"
          extensions={[loadLanguage('json')?.extension ?? []]}
          basicSetup={{ lineNumbers: true, defaultKeymap: true }}
          placeholder="Enter JSON content..."
          className={cn('h-full overflow-auto', error ? 'pb-8' : '')}
          foldGutter
        />
        {error && (
          <div className="absolute bottom-2 left-3 right-3 text-xs text-red-500">
            <span className="font-medium">Invalid JSON:</span> {error}
          </div>
        )}
      </div>
      <div className="mt-2 px-1">
        <span className="text-2xs text-neutral-400">
          Last updated at {formatTranslationDate(updatedAt, DATE_FORMAT_OPTIONS)}{' '}
          {formatTranslationTime(updatedAt, TIME_FORMAT_OPTIONS)} UTC
        </span>
      </div>
    </div>
  );
}

type EditorPanelProps = {
  selectedLocale: string | null;
  selectedTranslation: any;
  isLoadingTranslation: boolean;
  translationError: any;
  modifiedContent: Record<string, unknown> | null;
  jsonError: string | null;
  onContentChange: (content: string) => void;
  onDelete: (locale: string) => void | Promise<void>;
  resource: TranslationResource;
  onImportSuccess?: () => void;
  isDeleting?: boolean;
};

export function EditorPanel({
  selectedLocale,
  selectedTranslation,
  isLoadingTranslation,
  translationError,
  modifiedContent,
  jsonError,
  onContentChange,
  onDelete,
  resource,
  onImportSuccess,
  isDeleting = false,
}: EditorPanelProps) {
  if (!selectedLocale) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <RiFileTextLine className="mx-auto mb-4 h-12 w-12 text-neutral-400" />
          <p className="text-sm text-neutral-500">Select a locale to view and edit translations</p>
        </div>
      </div>
    );
  }

  const contentToUse = modifiedContent || selectedTranslation?.content || {};
  const contentToCopy = JSON.stringify(contentToUse, null, 2);

  return (
    <div className="flex flex-1 flex-col bg-neutral-50">
      <EditorActions
        selectedLocale={selectedLocale}
        contentToCopy={contentToCopy}
        content={contentToUse}
        resource={resource}
        onImportSuccess={onImportSuccess}
        onDelete={onDelete}
        isDeleting={isDeleting}
      />

      {isLoadingTranslation ? (
        <div className="flex-1 px-3 pb-3">
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ) : translationError ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-red-500">Failed to load translation for {selectedLocale}</p>
        </div>
      ) : selectedTranslation?.content ? (
        <JSONEditor
          content={JSON.stringify(contentToUse, null, 2)}
          onChange={onContentChange}
          error={jsonError}
          updatedAt={selectedTranslation.updatedAt}
        />
      ) : null}
    </div>
  );
}
