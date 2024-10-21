import styled from '@emotion/styled';
import { ActionIcon, FileButton, Group, Indicator, Stack, useMantineColorScheme } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { colors, Edit, Sidebar, Table, Text, Title, Tooltip, Trash, Upload, When } from '@novu/design-system';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Outlet } from 'react-router-dom';
import { useEnvironment } from '../../../hooks';
import { useFetchLocales, useFetchTranslationGroup, useUploadTranslations, useGetDefaultLocale } from '../hooks';
import { useEditTranslationFileContext } from '../context/useEditTranslationFileContext';
import {
  ArrowForward,
  TranslationFileIcon,
  TranslationFolderIcon,
  TranslationFolderIconSmall,
  UploadTranslationFilesHeaderIcon,
  Warning,
} from '../icons';
import { columns } from './columns';
import { DeleteGroupModal } from './TranslationGroup/DeleteGroupModal';
import { ReUploadConfirmationModal } from './UploadFilesSection/ReUploadConfirmationModal';
import { UploadTranslationsLayout } from './UploadFilesSection/UploadTranslationsLayout';

export type LocalesFormSchema = {
  formLocales: {
    locale: string;
  }[];
};

type UploadedFile = {
  name: string;
  locale: string;
  content: any;
  isValidJsonFile: boolean;
};

export const EditTranslationsSidebar = ({
  identifier,
  open,
  onClose,
  onEditGroup,
}: {
  open: boolean;
  onClose: () => void;
  onEditGroup: (id: string) => void;
  identifier: string;
}) => {
  const { group, isLoading } = useFetchTranslationGroup(identifier);
  const { locales } = useFetchLocales();
  const resetRef = useRef<() => void>(null);
  const { setGroupIdentifier } = useEditTranslationFileContext();
  const { isLoading: isUploadTranslationsLoading, uploadTranslations } = useUploadTranslations();
  const hasMissingTranslations = group?.translations.some((translation) => !translation.translations);

  const [replacingLocales, setReplacingLocales] = useState<string[]>([]);
  const [showReUploadModal, setShowReUploadModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [languageFiles, setLanguageFiles] = useState<File[]>([]);

  const [uploadFiles, setUploadFiles] = useState<UploadedFile[]>([]);

  const { readonly } = useEnvironment();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const { defaultLocale } = useGetDefaultLocale();

  const handleFileChange = async (files: File[]) => {
    setLanguageFiles(files);

    const updatedFiles: Array<UploadedFile> = [];

    for (const file of files) {
      const fileContent = await file.text();
      const isValidJsonFile = file.name.endsWith('.json');

      const detectedLanguage = file?.name?.replace('.json', '');
      const isValidLanguage = locales?.find((locale) => locale.langIso === detectedLanguage);
      updatedFiles.push({
        name: file.name,
        locale: isValidLanguage ? detectedLanguage : defaultLocale || '',
        content: fileContent,
        isValidJsonFile,
      });
    }

    setUploadFiles(updatedFiles);
    reset({
      formLocales: updatedFiles.map((item) => ({ locale: item.locale })),
    });
  };

  const localesWithFiles = useMemo(
    () => group?.translations?.filter((item) => item.translations),
    [group?.translations]
  );

  const handleUploadSubmit = async (formData) => {
    const replacedLocales = localesWithFiles?.filter((item) =>
      formData.formLocales.some((locale) => locale.locale === item.isoLanguage)
    );

    if (replacedLocales && replacedLocales.length > 0 && !showReUploadModal) {
      setReplacingLocales(replacedLocales.map((item) => item.isoLanguage));
      setShowReUploadModal(true);

      return;
    }

    handleReplaceSubmit(formData);
  };

  const handleReplaceSubmit = async (formData) => {
    if (group?.identifier) {
      await uploadTranslations(
        {
          identifier: group.identifier,
          locales: formData.formLocales.map((item) => item.locale),
          files: languageFiles,
        },
        {
          onSuccess: () => {
            resetUpload();
          },
        }
      );
    }
  };

  const { control, handleSubmit, reset } = useForm<LocalesFormSchema>({
    mode: 'onChange',
    defaultValues: {
      formLocales: [],
    },
  });

  const resetUpload = () => {
    setUploadFiles([]);
    setLanguageFiles([]);
    reset({
      formLocales: [],
    });
    setReplacingLocales([]);
    setShowReUploadModal(false);
    resetRef.current?.();
  };

  const removeLanguageFiles = useCallback((index: number) => {
    setLanguageFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const replaceLanguageFiles = useCallback(async (index: number, file: File) => {
    const content = await file.text();
    setLanguageFiles((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          return file;
        }

        return item;
      })
    );
    setUploadFiles((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          return {
            name: file.name,
            locale: item.locale,
            content,
            isValidJsonFile: file.name.endsWith('.json'),
          };
        }

        return item;
      })
    );
  }, []);

  useEffect(() => {
    if (group) {
      setGroupIdentifier(group?.identifier);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  const isUploadingPage = uploadFiles.length > 0;

  return (
    <>
      <Sidebar
        isOpened={open}
        onClose={onClose}
        onBack={onClose}
        isLoading={isLoading}
        onSubmit={handleSubmit(handleUploadSubmit)}
        isExpanded
        customHeader={
          <div style={{ display: 'flex', width: '100%', gap: 12 }}>
            <Group noWrap spacing={12} sx={{ maxWidth: 800, width: '100%' }}>
              <When truthy={!isUploadingPage}>
                <Tooltip
                  label={
                    <Group spacing={8} noWrap>
                      <Text color="#EAA900">
                        Upload a JSON with keys for all languages to use <br />
                        translations variables in the content editor
                      </Text>
                    </Group>
                  }
                  disabled={!hasMissingTranslations}
                  position="bottom"
                >
                  <Indicator
                    sx={{ cursor: 'pointer' }}
                    offset={6}
                    inline
                    position="bottom-end"
                    label={<Warning />}
                    disabled={!hasMissingTranslations}
                  >
                    <TranslationFolderIconSmall />
                  </Indicator>
                </Tooltip>
              </When>
              <When truthy={isUploadingPage}>
                <UploadTranslationFilesHeaderIcon />
              </When>
              <Stack spacing={0}>
                <Title size={2}>
                  {isUploadingPage ? 'Upload to ' : ''} {group?.name}
                </Title>
                <When truthy={!isUploadingPage}>
                  <Text size={14} color={colors.B40}>
                    {group?.identifier}
                  </Text>
                </When>
                <When truthy={isUploadingPage}>
                  <Text size={14} color={colors.B60}>
                    {uploadFiles.length} JSON files to be uploaded to {group?.identifier}
                  </Text>
                </When>
              </Stack>
            </Group>

            <Group noWrap spacing={20} ml={'auto'} sx={{ alignItems: 'flex-start' }}>
              <div data-test-id="upload-files-container">
                <FileButton
                  onChange={handleFileChange}
                  accept="application/json"
                  multiple
                  name="files"
                  resetRef={resetRef}
                  disabled={readonly}
                  data-test-id="upload-files-btn"
                >
                  {(props) => (
                    <Tooltip label="Upload files">
                      <ActionIcon variant="transparent" {...props} disabled={readonly}>
                        <Upload style={{ width: 20, height: 20 }} color={colors.B60} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </FileButton>
              </div>
              <When truthy={!isUploadingPage}>
                <Tooltip label="Edit">
                  <ActionIcon
                    variant="transparent"
                    onClick={() => {
                      onEditGroup(identifier);
                    }}
                  >
                    <Edit style={{ width: 20, height: 20 }} color={colors.B60} />
                  </ActionIcon>
                </Tooltip>
                <When truthy={!readonly}>
                  <Tooltip label="Delete">
                    <ActionIcon
                      variant="transparent"
                      onClick={() => setShowDeleteGroupModal(true)}
                      data-test-id="delete-group-btn"
                    >
                      <Trash color={colors.B60} />
                    </ActionIcon>
                  </Tooltip>
                </When>
              </When>
            </Group>
          </div>
        }
      >
        <When truthy={isUploadingPage}>
          <UploadTranslationsLayout
            data={uploadFiles}
            control={control}
            cancelUpload={resetUpload}
            isLoading={isUploadTranslationsLoading}
            localesWithFiles={localesWithFiles}
            replaceLanguageFiles={replaceLanguageFiles}
            removeLanguageFiles={removeLanguageFiles}
          />
        </When>
        <When truthy={!isUploadingPage}>
          <Dropzone
            styles={{
              inner: {
                height: '100%',
                pointerEvents: 'all',
              },
              root: {
                borderRadius: '0px',
                border: 'none',
                padding: '0px',
                marginRight: '-5px',
                height: '100%',
                cursor: 'default',
                backgroundColor: isDark ? colors.B17 : colors.white,
                ':hover': {
                  backgroundColor: isDark ? colors.B17 : colors.white,
                },
                '&[data-accept]': {
                  backgroundColor: isDark ? colors.B17 : colors.white,
                  borderRadius: '0px',
                },
              },
            }}
            onDrop={handleFileChange}
            accept={['application/json']}
            activateOnClick={false}
            activateOnKeyboard={false}
            multiple
          >
            <Dropzone.Idle>
              <TableContainer>
                <Table loading={isLoading} data={group?.translations || []} columns={columns} />
              </TableContainer>
            </Dropzone.Idle>
            <Dropzone.Accept>
              <BgColorContainer isDark={isDark}>
                <GrowContainer isDark={isDark}>
                  <Stack spacing={12}>
                    <UploadIconContainer />
                    <Text align="center" size="lg" color={colors.B40}>
                      Drop JSON file to upload it to the group
                    </Text>
                  </Stack>
                </GrowContainer>
              </BgColorContainer>
            </Dropzone.Accept>

            <Dropzone.Reject>
              <RejectContainer isDark={isDark}>
                <Stack spacing={12}>
                  <UploadIconContainer />
                  <Text align="center" size="lg" color={colors.B80}>
                    Drop JSON file to upload it to the group
                  </Text>
                  <Text align="center" size="lg" color={colors.error}>
                    Selected files contains unsupported file type
                  </Text>
                </Stack>
              </RejectContainer>
            </Dropzone.Reject>
          </Dropzone>
        </When>
        <ReUploadConfirmationModal
          isLoading={isUploadTranslationsLoading}
          locales={replacingLocales}
          open={showReUploadModal}
          onDismiss={() => setShowReUploadModal(false)}
          onConfirm={handleSubmit(handleReplaceSubmit)}
        />
        {group && (
          <DeleteGroupModal
            groupIdentifier={identifier}
            groupName={group.name}
            onDismiss={() => setShowDeleteGroupModal(false)}
            open={showDeleteGroupModal}
            onConfirm={() => {
              setShowDeleteGroupModal(false);
              onClose();
            }}
          />
        )}
      </Sidebar>
      <Outlet />
    </>
  );
};

function UploadIconContainer() {
  return (
    <Group spacing={24} noWrap align="center" position="center">
      <div style={{ position: 'relative', height: '58px', width: '88px' }}>
        <TranslationFileIcon style={{ position: 'absolute', top: 0 }} />
        <TranslationFileIcon
          style={{
            position: 'absolute',
            top: 0,
            left: '20px',
          }}
        />
        <TranslationFileIcon
          style={{
            position: 'absolute',
            top: 0,
            left: '40px',
          }}
        />
      </div>
      <ArrowForward />
      <TranslationFolderIcon />
    </Group>
  );
}

const TableContainer = styled.div`
  & tbody tr {
    .updated-at {
      display: block;
    }
    .row-actions {
      display: none;
    }
    &:hover {
      .updated-at {
        display: none;
      }
      .row-actions {
        display: block;
      }
    }
  }
`;

const GrowContainer = styled.div<{ isDark: boolean }>`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100%;
  border: 1px dashed ${colors.B40};
  border-radius: 16px;
  background-color: ${({ isDark }) => (isDark ? colors.B20 : colors.BGLight)};
  overflow: hidden;
`;

const RejectContainer = styled(GrowContainer)`
  border: 1px dashed ${colors.error};
  background-color: transparent;
`;

const BgColorContainer = styled.div<{ isDark: boolean }>`
  background-color: ${({ isDark }) => (isDark ? colors.B17 : colors.white)};
  height: 100%;
`;
