import { useRef, useCallback, ReactElement, cloneElement } from 'react';
import { useUploadTranslations } from '@/hooks/use-upload-translations';
import { ACCEPTED_FILE_EXTENSION } from './constants';
import { TranslationResource } from '@/types/translations';

type TranslationImportTriggerProps = {
  resource: TranslationResource;
  onSuccess?: () => void;
  children: ReactElement;
};

export function TranslationImportTrigger({ resource, onSuccess, children }: TranslationImportTriggerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadTranslations({ onSuccess });

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      try {
        await uploadMutation.mutateAsync({
          ...resource,
          files: Array.from(files),
        });
      } finally {
        // Clear the input value so the same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [uploadMutation, resource]
  );

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_EXTENSION}
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {cloneElement(children, {
        onClick: handleClick,
      })}
    </>
  );
}
