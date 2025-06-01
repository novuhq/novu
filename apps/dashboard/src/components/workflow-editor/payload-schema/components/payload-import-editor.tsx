import { RiInformation2Line, RiCloseLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Editor } from '@/components/primitives/editor';
import { isValidJson } from '../utils/generate-schema';
import { JSON_EDITOR_CONFIG, IMPORT_EDITOR_CLASSES, PLACEHOLDER_JSON, INFO_MESSAGES } from '../utils/constants';

type PayloadImportEditorProps = {
  isLoadingActivity: boolean;
  payloadNotFound: boolean;
  importedPayload: string;
  onPayloadChange: (value: string) => void;
  onGenerateSchema: () => void;
  onBack: () => void;
};

function LoadingState() {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <div className="text-center">
        <div className="mb-2">{INFO_MESSAGES.loadingActivity}</div>
        <div className="text-xs text-neutral-500">{INFO_MESSAGES.loadingSubtext}</div>
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
}: PayloadImportEditorProps) {
  if (isLoadingActivity) {
    return <LoadingState />;
  }

  const isJsonValid = isValidJson(importedPayload);

  return (
    <div className={IMPORT_EDITOR_CLASSES.container}>
      <div className={IMPORT_EDITOR_CLASSES.header}>
        <h3 className={IMPORT_EDITOR_CLASSES.title}>Import schema from JSON object</h3>
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
          extensions={JSON_EDITOR_CONFIG.extensions}
          basicSetup={JSON_EDITOR_CONFIG.basicSetup}
          multiline
          className={IMPORT_EDITOR_CLASSES.editor}
          placeholder={PLACEHOLDER_JSON}
        />
      </div>

      {/* Footer */}
      <div className={IMPORT_EDITOR_CLASSES.footer}>
        <div className={IMPORT_EDITOR_CLASSES.infoContainer}>
          <RiInformation2Line className={IMPORT_EDITOR_CLASSES.infoIcon} />
          {payloadNotFound ? INFO_MESSAGES.payloadNotFound : INFO_MESSAGES.payloadFound}
        </div>
        <Button variant="secondary" mode="outline" size="2xs" onClick={onGenerateSchema} disabled={!isJsonValid}>
          Generate schema
        </Button>
      </div>
    </div>
  );
}
