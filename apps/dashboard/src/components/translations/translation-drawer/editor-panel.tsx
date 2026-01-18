import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { RiFileTextLine } from 'react-icons/ri';
import { Editor } from '@/components/primitives/editor';
import { InlineToast } from '@/components/primitives/inline-toast';
import { Skeleton } from '@/components/primitives/skeleton';
import { TimeDisplayHoverCard } from '@/components/time-display-hover-card';
import { TranslationWithPlaceholder } from '@/hooks/use-fetch-translation';
import { cn } from '@/utils/ui';
import { DATE_FORMAT_OPTIONS, TIME_FORMAT_OPTIONS } from '../constants';
import { formatTranslationDate, formatTranslationTime } from '../utils';
import { EditorActions } from './editor-actions';

export function EditorPanelSkeleton() {
  return (
    <div className="flex flex-1 flex-col bg-neutral-50">
      {/* EditorActions skeleton - matches exact HTML structure */}
      <div className="flex flex-col items-start gap-6 self-stretch px-3 pb-3 pt-3">
        {/* First row: Flag + locale info + Import button */}
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" /> {/* Flag circle h-5 w-5 */}
            <div className="flex items-center gap-1">
              <Skeleton className="h-4 w-12" /> {/* "en_US" text-sm */}
              <Skeleton className="h-4 w-36" /> {/* "(English, United States)" text-sm */}
            </div>
          </div>
          <Skeleton className="h-8 w-28" /> {/* Import locale(s) button */}
        </div>

        {/* Second row: Translation JSON title + Copy/Download buttons */}
        <div className="flex w-full items-center justify-between">
          <Skeleton className="h-5 w-32" /> {/* "Translation JSON" text-sm font-medium */}
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8" /> {/* Copy button */}
            <Skeleton className="h-8 w-8" /> {/* Download button */}
          </div>
        </div>
      </div>

      {/* JSON Editor skeleton - matches the actual editor */}
      <div className="flex-1 px-3 pb-3">
        <div className="relative h-[calc(100%-24px)] rounded-lg border border-neutral-200 bg-white p-4">
          {/* Line numbers and content like real editor */}
          <div className="flex gap-4">
            <div className="text-neutral-400">
              <Skeleton className="h-4 w-3" /> {/* Line number "1" */}
            </div>
            <div>
              <Skeleton className="h-4 w-4" /> {/* The "{}" content */}
            </div>
          </div>
        </div>
        {/* Footer timestamp */}
        <div className="mt-2 px-1 h-6 flex items-center">
          <Skeleton className="h-3 w-60" /> {/* "Last updated at Jul 22, 2025 15:11:30 UTC" */}
        </div>
      </div>
    </div>
  );
}

type JSONEditorProps = {
  content: string;
  onChange: (value: string) => void;
  error: string | null;
  updatedAt: string;
  isOutdated?: boolean;
  isReadOnly?: boolean;
};

const JSON_EXTENSIONS = [loadLanguage('json')?.extension ?? []];
const BASIC_SETUP = { lineNumbers: true, defaultKeymap: true };

function JSONEditor({ content, onChange, error, updatedAt, isOutdated, isReadOnly = false }: JSONEditorProps) {
  return (
    // 112px is the height of the actions section
    <div className="flex-1 px-3 pb-3 flex flex-col max-h-[calc(100%-112px)]">
      <div
        className={cn(
          'relative overflow-hidden w-full rounded-lg border bg-white flex-1 ',
          error ? 'border-red-300' : 'border-neutral-200',
          isReadOnly && 'bg-neutral-50'
        )}
      >
        <Editor
          value={content}
          onChange={onChange}
          lang="json"
          extensions={JSON_EXTENSIONS}
          basicSetup={BASIC_SETUP}
          placeholder="Enter JSON content..."
          className={cn(
            'flex-1 [&_.cm-scroller]:p-4 [&_div.cm-gutters]:bg-background [&_div.cm-gutters]:-translate-x-[16px] [&_div.cm-gutters]:pl-4 [&_div.cm-gutters]:-ml-4 [&_.cm-editor]:h-full rounded-lg [&_.cm-scroller]:h-full! [&_.cm-scroller]:overflow-auto [&_.cm-content]:max-w-[calc(100%-2rem)]',
            error ? 'h-[calc(100%-32px)]' : 'h-full'
          )}
          foldGutter
          multiline
          readOnly={isReadOnly}
        />
        {error && (
          <div className="px-4 py-2 text-xs text-red-500 h-min">
            <span className="font-medium">Invalid JSON:</span> {error}
          </div>
        )}
        {isReadOnly && (
          <div className="absolute right-2 top-2">
            <div className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-600">Read-only</div>
          </div>
        )}
      </div>

      {isOutdated && (
        <div className="mt-3 px-1">
          <InlineToast
            variant="warning"
            title="Warning:"
            description="Some keys in this target language don't match the default language. Add missing keys or remove extra ones to sync translations."
          />
        </div>
      )}

      <div className="mt-2 px-1">
        <TimeDisplayHoverCard date={updatedAt} className="text-2xs text-neutral-400">
          Last updated at {formatTranslationDate(updatedAt, DATE_FORMAT_OPTIONS)}{' '}
          {formatTranslationTime(updatedAt, TIME_FORMAT_OPTIONS)} UTC
        </TimeDisplayHoverCard>
      </div>
    </div>
  );
}

type EditorPanelProps = {
  selectedTranslation: TranslationWithPlaceholder | undefined;
  isLoadingTranslation: boolean;
  translationError: any;
  content: string;
  modifiedContent: Record<string, any> | null;
  jsonError: string | null;
  onContentChange: (content: string) => void;
  outdatedLocales?: string[];
  isReadOnly?: boolean;
};

export function EditorPanel({
  selectedTranslation,
  isLoadingTranslation,
  translationError,
  content,
  modifiedContent,
  jsonError,
  onContentChange,
  outdatedLocales,
  isReadOnly = false,
}: EditorPanelProps) {
  if (isLoadingTranslation) {
    return <EditorPanelSkeleton />;
  }

  if (!selectedTranslation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <RiFileTextLine className="mx-auto mb-4 h-12 w-12 text-neutral-400" />
          <p className="text-sm text-neutral-500">Select a locale to view and edit translations</p>
        </div>
      </div>
    );
  }

  const isOutdated = outdatedLocales?.includes(selectedTranslation.locale);

  return (
    <div className="flex flex-1 flex-col bg-neutral-50 max-w-[calc(100%-400px)]">
      <EditorActions
        selectedTranslation={selectedTranslation}
        modifiedContent={modifiedContent}
        isReadOnly={isReadOnly}
      />

      {translationError ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-red-500">Failed to load translation for {selectedTranslation.locale}</p>
        </div>
      ) : selectedTranslation ? (
        <JSONEditor
          content={content}
          onChange={onContentChange}
          error={jsonError}
          updatedAt={selectedTranslation.updatedAt}
          isOutdated={isOutdated}
          isReadOnly={isReadOnly}
        />
      ) : null}
    </div>
  );
}
