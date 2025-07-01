import { useRef, useCallback, ReactElement, cloneElement } from 'react';
import { useUploadTranslations } from '@/hooks/use-upload-translations';
import { ACCEPTED_FILE_EXTENSION } from './constants';
import { TranslationResource } from '@/components/translations/types';

type TranslationImportTriggerProps = {
  resource: TranslationResource;
  onSuccess?: () => void;
  children: ReactElement;
};

export function TranslationImportTrigger({ resource, onSuccess, children }: TranslationImportTriggerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadTranslations();

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      try {
        const result = await uploadMutation.mutateAsync({
          ...resource,
          files: Array.from(files),
        });

        if (result.successfulUploads > 0) {
          onSuccess?.();
        }
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [uploadMutation, resource, onSuccess]
  );

  const handleClick = useCallback(() => {
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
        className="hidden"
      />
      {cloneElement(children, {
        onClick: (e: React.MouseEvent) => {
          children.props.onClick?.(e);
          handleClick();
        },
      })}
    </>
  );
}
