import styled from '@emotion/styled';
import { Group, ScrollArea } from '@mantine/core';
import { Button, colors, Popover, Text } from '@novu/design-system';
import React from 'react';
import { useWatch } from 'react-hook-form';
import { UploadTranslationFilesAccordion } from './UploadTranslationFilesAccordion';

export function UploadTranslationsLayout({
  data,
  control,
  cancelUpload,
  isLoading,
  localesWithFiles,
  replaceLanguageFiles,
  removeLanguageFiles,
}) {
  const formLocales = useWatch({
    control,
    name: `formLocales`,
  });

  const locales = formLocales?.map((item) => item.locale);
  const uniqueLocales = [...new Set<string>(locales)];
  const isError = locales?.length !== uniqueLocales?.length;

  return (
    <Wrapper>
      <ScrollArea>
        <UploadTranslationFilesAccordion
          data={data}
          control={control}
          localesWithFiles={localesWithFiles}
          replaceLanguageFiles={replaceLanguageFiles}
          removeLanguageFiles={removeLanguageFiles}
        />
      </ScrollArea>
      <Footer>
        <Group spacing={24}>
          <Button variant="outline" onClick={cancelUpload}>
            Cancel
          </Button>
          <Popover
            disabled={!isError}
            content={
              <div
                style={{
                  width: '360px',
                }}
              >
                <Text color={colors.B60}>
                  Uploading multiple files in the same language is not permitted. Please select different languages for
                  each of the uploaded file.
                </Text>
              </div>
            }
            position="top-end"
            target={
              <div>
                <Button submit loading={isLoading} disabled={isLoading || isError} data-test-id="upload-submit-btn">
                  Upload files
                </Button>
              </div>
            }
            offset={5}
          />
        </Group>
      </Footer>
    </Wrapper>
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
  padding: 16px 24px 24px 24px;
  justify-content: space-between;
  align-items: center;
  align-self: stretch;
  gap: 24px;
  margin-left: -24px;
  margin-right: -24px;
`;
