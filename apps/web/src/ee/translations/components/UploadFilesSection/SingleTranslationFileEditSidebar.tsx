import styled from '@emotion/styled';
import { ActionIcon, FileButton, Group, Stack } from '@mantine/core';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, colors, Sidebar, Text, Title, Tooltip, Trash, When } from '@novu/design-system';
import { useEnvironment } from '../../../../hooks';

import { useFetchLocales, useFetchTranslation } from '../../hooks';
import { useEditTranslationFileContext } from '../../context/useEditTranslationFileContext';
import { ReuploadIcon } from '../../icons';
import { FlagIcon } from '../shared';
import { FileEditEditor } from './FileEditEditor';
import { FileNameInput } from './FileNameInput';
import { FilesDiffSection } from './FilesDiffSection';
import { ReUploadConfirmationModal } from './ReUploadConfirmationModal';
import { DeleteTranslationModal } from '../TranslationGroup/DeleteTranslationModal';

export function SingleTranslationFileEditSidebar({
  identifier,
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  identifier: string;
}) {
  const {
    locale,
    uploadedFile,
    handleFileSelect,
    fileText,
    uploadFile,
    isTranslationExists,
    resetContext,
    editFile,
    fileName: editedFileName,
  } = useEditTranslationFileContext();

  const { mode } = useParams();
  const navigate = useNavigate();
  const { readonly } = useEnvironment();

  const { translations, fileName, createdAt, updatedAt } = useFetchTranslation(identifier, locale);
  const { getLocale } = useFetchLocales();

  const [showDeleteTranslationModal, setShowDeleteTranslationModal] = useState(false);
  const [showReuploadModal, setShowReuploadModal] = useState(false);
  const [isValidJsonFile, setIsValidJsonFile] = useState(true);
  const handleClose = useCallback(() => {
    resetContext();
    onClose();
  }, [resetContext, onClose]);

  useEffect(() => {
    if (mode === 'replace') {
      if (!locale && (!uploadedFile || !fileText)) {
        handleClose();
      }
    }

    if (!locale) {
      handleClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFile, handleClose, mode]);

  const handleUpdateFile = async () => {
    if (mode === 'replace') {
      if (isTranslationExists) {
        setShowReuploadModal(true);

        return;
      }

      await submitFile();
    }

    if (mode === 'edit') {
      await submitEditedFile();
    }
  };

  const submitFile = async () => {
    await uploadFile();
    handleClose();
  };

  const submitEditedFile = async () => {
    await editFile();
    handleClose();
  };

  const handleFileInput = async (file: File | null) => {
    if (!file) return;

    await handleFileSelect(file);
    navigate(`/translations/edit/${identifier}/${locale}/replace`);
  };

  return (
    <Sidebar
      isOpened={open}
      onClose={handleClose}
      onBack={handleClose}
      isExpanded
      customHeader={
        <div style={{ display: 'flex', width: '100%', gap: 12 }}>
          <Group noWrap spacing={12} sx={{ maxWidth: 800, width: '100%' }}>
            <FlagIcon locale={locale} width={32} height={32} />

            <Stack spacing={0}>
              <Title size={2}>{getLocale(locale)?.langName}</Title>
              <Text size={12} color={colors.B40}>
                {identifier}
              </Text>
            </Stack>
          </Group>
          <When truthy={!readonly}>
            <Group noWrap spacing={20} ml={'auto'} sx={{ alignItems: 'flex-start' }}>
              <When truthy={translations && fileName}>
                <FileButton onChange={handleFileInput} accept="application/json" name="file">
                  {(props) => (
                    <Tooltip label="Replace file" withinPortal>
                      <ActionIcon variant="subtle" {...props}>
                        <ReuploadIcon color={colors.B60} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </FileButton>
                <Tooltip label="Delete file" withinPortal>
                  <ActionIcon variant="subtle" onClick={() => setShowDeleteTranslationModal(true)}>
                    <Trash color={colors.B60} />
                  </ActionIcon>
                </Tooltip>
              </When>
            </Group>
          </When>
        </div>
      }
      customFooter={
        <Footer>
          <Group spacing={24} position="right" noWrap>
            <Button variant="outline" onClick={handleClose}>
              {readonly ? 'Close' : 'Cancel'}
            </Button>
            <Tooltip
              label={
                !isValidJsonFile
                  ? 'The file contains invalid JSON values. Please correct errors to save changes.'
                  : 'File name can not be empty.'
              }
              withinPortal
              disabled={(isValidJsonFile && !!editedFileName) || readonly}
              error
              width={!isValidJsonFile ? 260 : 200}
              multiline
            >
              <span>
                <Button onClick={handleUpdateFile} disabled={!isValidJsonFile || !editedFileName || readonly}>
                  {mode === 'edit' ? 'Save' : 'Update file'}
                </Button>
              </span>
            </Tooltip>
          </Group>
        </Footer>
      }
    >
      <Wrapper>
        <Stack>
          {}
          <FileNameInput currentFileName={isTranslationExists ? fileName! : uploadedFile!.name} readonly={readonly} />
          {mode === 'replace' && isTranslationExists && (
            <FilesDiffSection
              setIsValidJsonFile={setIsValidJsonFile}
              text={fileText}
              original={translations}
              readonly={readonly}
            />
          )}
          {mode === 'edit' && (translations || fileText) && (
            <FileEditEditor
              value={translations || fileText}
              createdAt={createdAt}
              updatedAt={updatedAt}
              setIsValidJsonFile={setIsValidJsonFile}
              readonly={readonly}
            />
          )}
        </Stack>
      </Wrapper>
      <ReUploadConfirmationModal
        isLoading={false}
        locales={[locale]}
        onConfirm={submitFile}
        open={showReuploadModal}
        onDismiss={() => setShowReuploadModal(false)}
      />
      <When truthy={showDeleteTranslationModal && !readonly}>
        <DeleteTranslationModal
          groupIdentifier={identifier}
          onDismiss={() => setShowDeleteTranslationModal(false)}
          open={showDeleteTranslationModal}
          onConfirm={() => {
            setShowDeleteTranslationModal(false);
            navigate(`/translations/edit/${identifier}`);
          }}
          locale={locale}
        />
      </When>
    </Sidebar>
  );
}

const Wrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const Footer = styled.div`
  display: flex;
  padding: 16px 0px;
  justify-content: flex-end;
  align-items: center;
  align-self: stretch;
  gap: 24px;
  width: 100%;
`;
