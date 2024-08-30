import styled from '@emotion/styled';
import { Accordion, Group, Indicator, Stack, createStyles } from '@mantine/core';
import { Text, Tooltip, colors } from '@novu/design-system';
import React, { useState } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { useEnvironment } from '../../../../hooks';

import { CodeBracketOutlined, Warning } from '../../icons';
import { AccordionRowActionTools } from './AccordionRowActionTools';
import { FilesDiffSection } from './FilesDiffSection';
import { LanguageSelect } from './LanguageSelect';

const useStyles = createStyles((theme) => ({
  control: {
    paddingBottom: '15px',
    paddingLeft: '25px',
    paddingRight: '25px',
    paddingTop: '15px',
    '&:hover': {
      borderRadius: '7px',
    },
  },
  item: {
    marginBottom: 0,
    border: 'none',
    borderBottom: `1px solid ${theme.colorScheme === 'dark' ? colors.B20 : colors.B85}`,
    color: `${colors.B80}`,
    borderRadius: 0,
    backgroundColor: `transparent`,
    '&:hover': {
      backgroundColor: `${theme.colorScheme === 'dark' ? colors.B20 : colors.B98}`,
    },
  },
  chevron: {
    color: `${theme.colorScheme === 'dark' ? colors.white : colors.B40}`,
    borderRadius: '50px',
    height: '30px',
    width: '30px',
  },
  accordingHeader: {
    borderBottom: `1px solid ${theme.colorScheme === 'dark' ? colors.B30 : colors.B85}`,
  },
  content: {
    paddingBlock: 0,
  },
}));

export function UploadTranslationFilesAccordion({
  data,
  control,
  localesWithFiles,
  replaceLanguageFiles,
  removeLanguageFiles,
}) {
  const { classes } = useStyles();
  const [isValidJsonFile, setIsValidJsonFile] = useState(true);
  const [accordionValue, setAccordionValue] = useState<string | null>(null);

  const { readonly } = useEnvironment();
  const handleAccordionChange = (value: string | null) => {
    setAccordionValue((prev) => (prev === value ? null : value));
  };

  const { remove } = useFieldArray({
    control,
    name: 'formLocales',
  });

  const handleReplaceRow = (index: number, file: File | null) => {
    replaceLanguageFiles(index, file);
  };

  const handleRemoveRow = (index: number) => {
    remove(index);
    removeLanguageFiles(index);
  };

  return (
    <div>
      <Group px={24} grow>
        <Group position="apart" className={classes.accordingHeader} pb={10}>
          <div>
            <Text color={colors.B40}>Name</Text>
          </div>
          <div
            style={{
              width: '305px',
            }}
          >
            <Text color={colors.B40}>Detected Language</Text>
          </div>
        </Group>
      </Group>
      <Accordion
        classNames={classes}
        variant="default"
        chevron={null}
        value={accordionValue}
        onChange={setAccordionValue}
      >
        {data.map((item, index) => {
          const value = item.name + index;

          return (
            <Accordion.Item key={item.name} value={value}>
              <AccordionRowControl
                item={item}
                setAccordionValue={handleAccordionChange}
                value={value}
                control={control}
                index={index}
                accordionValue={accordionValue}
                isValidJsonFile={item.isValidJsonFile && isValidJsonFile}
                localesWithFiles={localesWithFiles}
                removeRow={handleRemoveRow}
                replaceRow={handleReplaceRow}
              />
              <Accordion.Panel>
                <AccordionRowPanel
                  localesWithFiles={localesWithFiles}
                  control={control}
                  index={index}
                  text={item.content}
                  isValidJsonFile={item.isValidJsonFile}
                  setIsValidJsonFile={setIsValidJsonFile}
                  readonly={readonly}
                />
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </div>
  );
}

const AccordionRowControl = ({
  item,
  setAccordionValue,
  value,
  control,
  index,
  accordionValue,
  isValidJsonFile,
  localesWithFiles,
  removeRow,
  replaceRow,
}) => {
  const isOpened = accordionValue === value;
  const currentLocale = useWatch({
    control,
    name: `formLocales.${index}.locale`,
  });
  const isReplacingFile = localesWithFiles?.some((data) => data.isoLanguage === currentLocale);

  return (
    <Group position="apart" noWrap>
      <Accordion.Control>
        <Group spacing={16} position="left" align="center" w="100%" noWrap>
          <Tooltip label={<ReplaceTooltipLabel />} disabled={!isReplacingFile}>
            <div>
              <Indicator
                label={<Warning width="16px" height="16px" />}
                position="bottom-end"
                size={12}
                offset={3}
                zIndex={'auto'}
                inline
                disabled={!isReplacingFile}
              >
                <CodeBracketOutlined />
              </Indicator>
            </div>
          </Tooltip>
          <Stack w="100%" spacing={0}>
            <FileNameContainer isOpened={isOpened}>
              <Text rows={1}>{item.name}</Text>
            </FileNameContainer>

            {!isOpened && (
              <div>
                {isValidJsonFile ? (
                  <Text size="sm" color={colors.B40}>
                    {Object.keys(item?.content).length} keys
                  </Text>
                ) : (
                  <Text size="sm" color={colors.error}>
                    Only JSON files can be uploaded
                  </Text>
                )}
              </div>
            )}
          </Stack>
        </Group>
      </Accordion.Control>
      <Group spacing={24} align="center" noWrap>
        {isValidJsonFile && <LanguageSelect control={control} index={index} />}
        <AccordionRowActionTools
          setAccordionValue={setAccordionValue}
          value={value}
          accordionValue={accordionValue}
          removeRow={removeRow}
          index={index}
          replaceRow={replaceRow}
        />
      </Group>
    </Group>
  );
};

const AccordionRowPanel = ({
  control,
  setIsValidJsonFile,
  localesWithFiles,
  index,
  text,
  isValidJsonFile,
  readonly,
}) => {
  const currentLocale = useWatch({
    control,
    name: `formLocales.${index}.locale`,
  });
  const original = localesWithFiles?.find((files) => files.isoLanguage === currentLocale);

  if (!isValidJsonFile) {
    return null;
  }

  return (
    <FilesDiffSection
      setIsValidJsonFile={setIsValidJsonFile}
      original={original?.translations || ''}
      text={text}
      readonly={readonly}
    />
  );
};

function ReplaceTooltipLabel() {
  return <Text color="#EAA900">Uploading file value will replace the existing file value</Text>;
}

const FileNameContainer = styled.div<{ isOpened: boolean }>`
  display: flex;
  align-items: center;
  border-radius: 7px;
  ${({ isOpened }) =>
    isOpened &&
    `
    flex: 1;
    padding: 15px;
    border: 1px solid ${colors.B30};
  `};
`;
