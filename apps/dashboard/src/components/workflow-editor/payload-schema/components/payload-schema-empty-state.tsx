import { RiAddLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { LinkButton } from '@/components/primitives/button-link';
import { EMPTY_STATE_CLASSES } from '../utils/constants';

type PayloadSchemaEmptyStateProps = {
  onAddProperty: () => void;
  isPayloadSchemaEnabled: boolean;
  hasNoSchema: boolean;
  onImportSchema: () => void;
};

export function PayloadSchemaEmptyState({
  onAddProperty,
  isPayloadSchemaEnabled,
  hasNoSchema,
  onImportSchema,
}: PayloadSchemaEmptyStateProps) {
  const isNewSchemaScenario = isPayloadSchemaEnabled && hasNoSchema;

  return (
    <div className={EMPTY_STATE_CLASSES.container}>
      <div className={EMPTY_STATE_CLASSES.titleContainer}>
        <h3 className={EMPTY_STATE_CLASSES.title}>
          {isNewSchemaScenario ? 'Schema not added yet' : 'Your schema starts here'}
        </h3>

        <p className={EMPTY_STATE_CLASSES.description}>
          {isNewSchemaScenario ? (
            "A payload schema hasn't been defined for this workflow yet. You can create one manually or import from recent payloads."
          ) : (
            <>
              Start building your payload schema by typing <code className={EMPTY_STATE_CLASSES.code}>{'{{ }}'}</code>{' '}
              to add variables, or create your schema first from this form.
            </>
          )}
        </p>
      </div>

      <div className={EMPTY_STATE_CLASSES.buttonContainer}>
        <div className={EMPTY_STATE_CLASSES.buttonWrapper}>
          <Button variant="secondary" mode="outline" size="2xs" leadingIcon={RiAddLine} onClick={onAddProperty}>
            Add property
          </Button>
        </div>

        {isNewSchemaScenario && (
          <LinkButton className={EMPTY_STATE_CLASSES.linkButton} underline onClick={onImportSchema}>
            Import schema from recent payload
          </LinkButton>
        )}
      </div>
    </div>
  );
}
