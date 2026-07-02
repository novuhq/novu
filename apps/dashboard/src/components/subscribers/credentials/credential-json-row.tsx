import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { CopyButton } from '@/components/primitives/copy-button';
import { DeleteButton } from '@/components/primitives/delete-button';
import { EditButton } from '@/components/primitives/edit-button';
import { CredentialJsonEditor, type ParseResult } from './credential-json-editor';

const iconButtonClassName = 'p-0.5 hover:bg-transparent';

type CredentialJsonRowProps<T> = {
  /** Pretty-printed JSON shown in the read-only view and used as the editor's initial value. */
  json: string;
  /** Human-readable entity name for a11y labels, e.g. "FCM device token". */
  ariaEntity: string;
  readOnly: boolean;
  parse: (raw: string) => ParseResult<T>;
  onSave: (value: T) => Promise<boolean>;
  onDelete: () => void;
  editorHeight?: string;
};

/** A single JSON credential rendered as a read-only card that flips to an inline editor. */
export function CredentialJsonRow<T>({
  json,
  ariaEntity,
  readOnly,
  parse,
  onSave,
  onDelete,
  editorHeight,
}: CredentialJsonRowProps<T>) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isEditing ? (
        <motion.div
          key="editor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <CredentialJsonEditor
            initialValue={json}
            saveLabel="Save"
            parse={parse}
            onSave={onSave}
            onCancel={() => setIsEditing(false)}
            height={editorHeight}
          />
        </motion.div>
      ) : (
        <motion.div
          key="display"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-bg-white flex items-start gap-1 rounded-md p-1.5 shadow-xs"
        >
          <pre className="text-paragraph-xs nv-no-scrollbar min-w-0 flex-1 overflow-x-auto font-mono text-text-sub">
            {json}
          </pre>
          <div className="flex shrink-0 items-center gap-1">
            <CopyButton
              valueToCopy={json}
              size="2xs"
              className={iconButtonClassName}
              ariaLabel={`Copy ${ariaEntity}`}
            />
            {!readOnly && (
              <>
                <EditButton
                  size="2xs"
                  className={iconButtonClassName}
                  aria-label={`Edit ${ariaEntity}`}
                  onClick={() => setIsEditing(true)}
                />
                <DeleteButton
                  size="2xs"
                  className={iconButtonClassName}
                  aria-label={`Delete ${ariaEntity}`}
                  onClick={onDelete}
                />
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
