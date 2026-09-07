import { RiAddLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { LinkButton } from '@/components/primitives/button-link';

type PayloadSchemaEmptyStateProps = {
  onAddProperty: () => void;
  isPayloadSchemaEnabled: boolean;
  hasNoSchema: boolean;
  onImportSchema: () => void;
  onImportFromJson: () => void;
  disabled?: boolean;
};

export function PayloadSchemaEmptyState({
  onAddProperty,
  isPayloadSchemaEnabled,
  hasNoSchema,
  onImportSchema,
  onImportFromJson,
  disabled = false,
}: PayloadSchemaEmptyStateProps) {
  const isNewSchemaScenario = isPayloadSchemaEnabled && hasNoSchema;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 bg-white p-4 text-center">
      <div className="mb-6 space-y-2">
        <h3 className="text-text-sub text-label-xs">
          {isNewSchemaScenario ? 'Schema not added yet' : 'Your schema starts here'}
        </h3>

        <p className="text-text-soft text-paragraph-xs max-w-md">
          {isNewSchemaScenario ? (
            "A payload schema hasn't been defined for this workflow yet. You can create one manually or import from recent payloads."
          ) : (
            <>
              Start building your payload schema by typing{' '}
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">{'{{ }}'}</code> to add variables, or create
              your schema first from this form.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center justify-center">
          <Button
            variant="secondary"
            mode="outline"
            size="2xs"
            leadingIcon={RiAddLine}
            onClick={onAddProperty}
            disabled={disabled}
          >
            Add property
          </Button>
        </div>

        {isNewSchemaScenario && (
          <LinkButton className="text-label-xs" underline onClick={onImportSchema} disabled={disabled}>
            Import schema from recent payload
          </LinkButton>
        )}

        {!isNewSchemaScenario && (
          <LinkButton className="text-label-xs" underline onClick={onImportFromJson} disabled={disabled}>
            Import from JSON object
          </LinkButton>
        )}
      </div>
    </div>
  );
}
