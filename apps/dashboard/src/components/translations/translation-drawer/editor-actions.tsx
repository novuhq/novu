import { RiFileUploadLine, RiDownloadLine, RiDeleteBinLine } from 'react-icons/ri';
import { useState } from 'react';
import { Button } from '@/components/primitives/button';
import { CopyButton } from '@/components/primitives/copy-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { FlagCircle } from '@/components/flag-circle';
import { TranslationImportTrigger } from '../translation-import-trigger';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { getLocaleDisplayName } from '../utils';
import { useTranslationFileOperations } from './hooks';
import { TranslationResource } from '@/components/translations/types';

type EditorActionsProps = {
  selectedLocale: string;
  contentToCopy: string;
  content: Record<string, unknown>;
  resource: TranslationResource;
  onImportSuccess?: () => void;
  onDelete: (locale: string) => void | Promise<void>;
  isDeleting?: boolean;
};

export function EditorActions({
  selectedLocale,
  contentToCopy,
  content,
  resource,
  onImportSuccess,
  onDelete,
  isDeleting = false,
}: EditorActionsProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { handleDownload } = useTranslationFileOperations();
  const displayName = getLocaleDisplayName(selectedLocale);

  const handleDeleteClick = () => setIsDeleteModalOpen(true);

  const handleDeleteConfirm = async () => {
    await onDelete(selectedLocale);
    setIsDeleteModalOpen(false);
  };

  return (
    <>
      <div className="flex flex-col items-start gap-6 self-stretch px-3 pb-3 pt-3">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <FlagCircle locale={selectedLocale} size="md" />
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-neutral-600">{selectedLocale}</span>
              <span className="text-sm text-neutral-400">({displayName})</span>
            </div>
          </div>
          <TranslationImportTrigger resource={resource} onSuccess={onImportSuccess}>
            <Button variant="secondary" mode="outline" size="xs" leadingIcon={RiFileUploadLine}>
              Import locale(s)
            </Button>
          </TranslationImportTrigger>
        </div>

        <div className="flex w-full items-center justify-between">
          <span className="text-sm font-medium text-neutral-900">Translation JSON</span>
          <div className="flex items-center gap-1">
            <CopyButton
              valueToCopy={contentToCopy}
              size="xs"
              className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
            />
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="secondary"
                  mode="outline"
                  size="xs"
                  className="px-2 py-1.5"
                  onClick={() => handleDownload(selectedLocale, content)}
                >
                  <RiDownloadLine className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export translation JSON</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="secondary"
                  mode="outline"
                  size="xs"
                  className="px-2 py-1.5 text-neutral-700 hover:text-red-500"
                  onClick={handleDeleteClick}
                >
                  <RiDeleteBinLine className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete {selectedLocale} translation</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <ConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete translation"
        description={
          <span>
            Are you sure you want to delete the <span className="font-bold">{selectedLocale}</span> translation? This
            action cannot be undone.
          </span>
        }
        confirmButtonText="Delete translation"
        isLoading={isDeleting}
      />
    </>
  );
}
