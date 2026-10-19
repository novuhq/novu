import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { RiCloseLine, RiInformation2Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Editor } from '@/components/primitives/editor';
import { isValidJson } from '../utils/generate-schema';

type PayloadImportEditorProps = {
  isLoadingActivity: boolean;
  payloadNotFound: boolean;
  importedPayload: string;
  onPayloadChange: (value: string) => void;
  onGenerateSchema: () => void;
  onBack: () => void;
  isManualImport?: boolean;
};

function LoadingState() {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <div className="text-center">
        <div className="mb-2">Loading recent payloads...</div>
        <div className="text-xs text-neutral-500">Fetching from activity feed</div>
      </div>
    </div>
  );
}

export function PayloadImportEditor({
  isLoadingActivity,
  payloadNotFound,
  importedPayload,
  onPayloadChange,
  onGenerateSchema,
  onBack,
  isManualImport = false,
}: PayloadImportEditorProps) {
  if (isLoadingActivity) {
    return <LoadingState />;
  }

  const isJsonValid = isValidJson(importedPayload);

  const getInfoMessage = () => {
    if (isManualImport) {
      return 'Paste an example json of the payload to generate schema';
    }

    return payloadNotFound
      ? 'No recent payload found. Please paste your JSON above.'
      : 'Using data from the most recent workflow trigger.';
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex flex-row items-center justify-between gap-2">
        <h3 className="text-label-xs w-full">Import schema from JSON object</h3>
        <Button variant="secondary" mode="ghost" size="2xs" leadingIcon={RiCloseLine} onClick={onBack}>
          Discard
        </Button>
      </div>

      {/* JSON Editor */}
      <div className="flex-1">
        <Editor
          value={importedPayload}
          onChange={onPayloadChange}
          lang="json"
          extensions={[loadLanguage('json')?.extension ?? []]}
          basicSetup={{ lineNumbers: true, defaultKeymap: true }}
          multiline
          className="h-full min-h-[200px] overflow-auto rounded-lg border border-neutral-200 bg-white"
          placeholder={JSON.stringify({ example: 'Paste your payload JSON here' }, null, 2)}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <RiInformation2Line className="size-3" />
          {getInfoMessage()}
        </div>
        <Button variant="secondary" mode="outline" size="2xs" onClick={onGenerateSchema} disabled={!isJsonValid}>
          Generate schema
        </Button>
      </div>
    </div>
  );
}
