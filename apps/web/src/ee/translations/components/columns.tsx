import styled from '@emotion/styled';
import { FileButton, Group, Indicator, Skeleton, Stack, useMantineColorScheme } from '@mantine/core';
import {
  ActionButton,
  colors,
  IExtendedCellProps,
  IExtendedColumn,
  PencilOutlined,
  Text,
  Tooltip,
  Trash,
  Upload,
  When,
  withCellLoading,
} from '@novu/design-system';
import { format } from 'date-fns';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlagMap } from '../icons/flags';

import { useEnvironment } from '../../../hooks';
import { ITranslation, useFetchLocales } from '../hooks';
import { useEditTranslationFileContext } from '../context/useEditTranslationFileContext';
import { ReuploadIcon, Star, Warning } from '../icons';
import { DeleteTranslationModal } from './TranslationGroup/DeleteTranslationModal';
import { useGetDefaultLocale } from '../hooks/useGetDefaultLocale';

const LanguageCell = ({ row: { original }, isLoading }: IExtendedCellProps<ITranslation>) => {
  const { getLocale } = useFetchLocales();
  const { isoLanguage, fileName } = original;
  const langName = getLocale(isoLanguage)?.langName;
  const { defaultLocale } = useGetDefaultLocale();
  const isDefaultLocale = defaultLocale === isoLanguage;
  const Icon = FlagMap[isoLanguage];
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  if (isLoading) {
    return (
      <Group spacing={12}>
        <Skeleton circle width={32} height={32} />
        <Stack spacing={2}>
          <Skeleton width={120} height={18} />
          <Skeleton width={100} height={14} />
        </Stack>
      </Group>
    );
  }

  return (
    <Group key={isoLanguage} spacing={12} data-test-id={`translation-row`} noWrap>
      <Indicator disabled={!isDefaultLocale} offset={isDark ? 7 : 9} inline label={<Star />}>
        <Tooltip
          label={
            <Group spacing={8} noWrap>
              <Upload color={colors.B40} width={32} height={32} />
              <Text color="#EAA900">
                Upload a JSON with {langName} keys to use <br /> translations variables in the content editor
              </Text>
            </Group>
          }
          disabled={fileName}
          position="bottom"
        >
          <Indicator
            sx={{ cursor: 'pointer' }}
            offset={8}
            disabled={fileName}
            inline
            position="bottom-end"
            label={<Warning width={12} height={12} />}
          >
            <IconWrapper>
              <Icon width={32} height={32} viewBox="0 0 40 40" />
            </IconWrapper>
          </Indicator>
        </Tooltip>
      </Indicator>

      <Stack spacing={0}>
        <Text data-test-id="translation-language">{langName}</Text>
        <Text size={12} color={colors.B40} data-test-id="translation-filename">
          {fileName ?? 'Empty...'}
        </Text>
      </Stack>
    </Group>
  );
};

const UpdateCell = ({ row: { original }, isLoading }: IExtendedCellProps<ITranslation>) => {
  const { isoLanguage, translations, fileName } = original;
  const navigate = useNavigate();
  const { handleFileSelect, setLocale, groupIdentifier, setIsTranslationExists } = useEditTranslationFileContext();

  const [showDeleteTranslationModal, setShowDeleteTranslationModal] = useState(false);
  const { readonly } = useEnvironment();

  const handleEdit = () => {
    setLocale(isoLanguage);
    setIsTranslationExists(!!translations);

    navigate(`/translations/edit/${groupIdentifier}/${isoLanguage}/edit`);
  };

  const handleFileInput = async (file: File | null) => {
    if (!file) return;
    setLocale(isoLanguage);
    setIsTranslationExists(!!translations);
    const path = translations ? 'replace' : 'edit';

    await handleFileSelect(file);
    navigate(`/translations/edit/${groupIdentifier}/${isoLanguage}/${path}`);
  };

  if (isLoading) {
    return (
      <Group spacing={12} noWrap>
        <Skeleton circle width={32} height={32} />
        <Stack spacing={2}>
          <Skeleton width={120} height={18} />
          <Skeleton width={100} height={14} />
        </Stack>
      </Group>
    );
  }

  return (
    <div>
      <div className="updated-at">
        <Text rows={1}>{format(new Date(original.updatedAt ?? '-'), 'dd/MM/yyyy HH:mm')}</Text>
      </div>
      <div className="row-actions">
        <When truthy={!readonly}>
          <Group spacing={20} noWrap>
            <When truthy={translations && fileName}>
              <Tooltip label="Replace file" withinPortal>
                <div>
                  <FileButton
                    inputProps={{ value: [] }}
                    onChange={handleFileInput}
                    accept="application/json"
                    name="files"
                  >
                    {(props) => <ActionButton {...props} Icon={ReuploadIcon} color={colors.B60} />}
                  </FileButton>
                </div>
              </Tooltip>
            </When>
            <When truthy={!translations || !fileName}>
              <Tooltip label="Upload file" withinPortal>
                <div>
                  <FileButton
                    inputProps={{ value: [] }}
                    onChange={handleFileInput}
                    accept="application/json"
                    name="files"
                  >
                    {(props) => <ActionButton {...props} Icon={Upload} color={colors.B60} />}
                  </FileButton>
                </div>
              </Tooltip>
            </When>
            <When truthy={translations && fileName}>
              <Tooltip label="Edit" withinPortal>
                <div>
                  <ActionButton onClick={handleEdit} Icon={PencilOutlined} color={colors.B60} />
                </div>
              </Tooltip>
            </When>
            <When truthy={translations && fileName}>
              <Tooltip label="Delete file" withinPortal>
                <div>
                  <ActionButton onClick={() => setShowDeleteTranslationModal(true)} Icon={Trash} color={colors.B60} />
                </div>
              </Tooltip>
            </When>
          </Group>
        </When>
        <When truthy={readonly}>
          <Tooltip label="View" withinPortal>
            <div>
              <ActionButton onClick={handleEdit} Icon={PencilOutlined} color={colors.B60} />
            </div>
          </Tooltip>
        </When>
      </div>
      <When truthy={showDeleteTranslationModal && !readonly}>
        <DeleteTranslationModal
          groupIdentifier={groupIdentifier}
          onDismiss={() => setShowDeleteTranslationModal(false)}
          open={showDeleteTranslationModal}
          onConfirm={() => {
            setShowDeleteTranslationModal(false);
          }}
          locale={isoLanguage}
        />
      </When>
    </div>
  );
};
export const columns: IExtendedColumn<ITranslation>[] = [
  {
    accessor: 'isoLanguage',
    Header: 'Language',
    maxWidth: 350,
    Cell: LanguageCell,
  },
  {
    accessor: 'value',
    Header: 'Value',
    width: 100,
    maxWidth: 100,
    Cell: withCellLoading(({ row: { original } }) => (
      <Text rows={1} data-test-id="translation-keys-value">
        {original.fileName && original.translations ? Object.keys(JSON.parse(original.translations))?.length : ''}
      </Text>
    )),
  },
  {
    accessor: 'createdAt',
    Header: 'Created at',
    width: 100,
    maxWidth: 100,
    Cell: withCellLoading(({ row: { original } }) => (
      <Text rows={1}>{format(new Date(original.createdAt ?? ''), 'dd/MM/yyyy HH:mm')}</Text>
    )),
  },
  {
    accessor: 'updatedAt',
    Header: 'Updated at',
    width: 100,
    maxWidth: 100,
    Cell: UpdateCell,
  },
];

const IconWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px;
`;
