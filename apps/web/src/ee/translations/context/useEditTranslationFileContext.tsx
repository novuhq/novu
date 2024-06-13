import React, { createContext, useContext, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { successMessage } from '@novu/design-system';

import { useEditTranslation, useUploadTranslations } from '../hooks';

interface EditTranslationFileContextData {
  uploadedFile: File | null;
  locale: string;
  groupIdentifier: string;
  fileText: string;
  isTranslationExists: boolean;
  setIsTranslationExists: (isTranslationExists: boolean) => void;
  setLocale: (locale: string) => void;
  setGroupIdentifier: (groupIdentifier: string) => void;
  handleFileSelect: (file: File) => Promise<void>;
  uploadFile: () => Promise<void>;
  resetContext: () => void;
  setFileText: (fileText: string) => void;
  editFile: () => Promise<void>;
  fileName: string;
  setFileName: (fileName: string) => void;
}

export const EditTranslationFileContext = createContext<EditTranslationFileContextData>({
  uploadedFile: null,
  locale: '',
  groupIdentifier: '',
  fileText: '',
  isTranslationExists: false,
  fileName: '',
  setLocale: () => {},
  setGroupIdentifier: () => {},
  handleFileSelect: async () => {},
  uploadFile: async () => {},
  setIsTranslationExists: () => {},
  resetContext: () => {},
  setFileText: () => {},
  editFile: async () => {},
  setFileName: () => {},
});

export const useEditTranslationFileContext = (): EditTranslationFileContextData =>
  useContext(EditTranslationFileContext);

export const EditTranslationFileProvider = ({ children }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [locale, setLocale] = useState('');
  const [groupIdentifier, setGroupIdentifier] = useState('');
  const [fileText, setFileText] = useState('');
  const [isTranslationExists, setIsTranslationExists] = useState(false);
  const [fileName, setFileName] = useState('');

  const queryClient = useQueryClient();
  const { uploadTranslations } = useUploadTranslations();
  const { editTranslation } = useEditTranslation();

  const handleFileSelect = async (file: File) => {
    setUploadedFile(file);
    setFileName(file.name);
    setFileText(await file.text());
  };

  const uploadFile = async () => {
    if (!uploadedFile) {
      return;
    }
    await uploadTranslations(
      {
        identifier: groupIdentifier,
        locales: [locale],
        files: [uploadedFile],
      },
      {
        onSuccess: () => {
          successMessage('File uploaded successfully');
          queryClient.refetchQueries([`group/${groupIdentifier}/${locale}`]);
        },
      }
    );
  };

  const resetContext = () => {
    setUploadedFile(null);
    setLocale('');
    setFileText('');
    setIsTranslationExists(false);
  };

  const editFile = async () => {
    await editTranslation(
      {
        fileName,
        locale,
        identifier: groupIdentifier,
        translation: fileText,
      },
      {
        onSuccess: () => {
          successMessage('File edited successfully');
        },
      }
    );
  };

  return (
    <EditTranslationFileContext.Provider
      value={{
        uploadedFile,
        locale,
        setLocale,
        groupIdentifier,
        setGroupIdentifier,
        fileText,
        handleFileSelect,
        uploadFile,
        isTranslationExists,
        setIsTranslationExists,
        resetContext,
        setFileText,
        editFile,
        fileName,
        setFileName,
      }}
    >
      {children}
    </EditTranslationFileContext.Provider>
  );
};
