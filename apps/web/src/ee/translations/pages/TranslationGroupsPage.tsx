import { Container, Group, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { colors, PageContainer, Text, Title, When, IRow } from '@novu/design-system';
import { useAuth, useEnvironment } from '../../../hooks';
import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { FlagIcon } from '../components/shared';

import { ITranslationGroup, useFetchLocales, useFetchTranslationGroups } from '../hooks';
import { DefaultLocaleModal } from '../components/DefaultLocaleModal';
import { TranslationGroupEmptyList } from '../components/TranslationGroup/TranslationGroupEmptyList';
import { TranslationGroupListToolbar } from '../components/TranslationGroup/TranslationGroupListToolbar';
import { TranslationGroupsList } from '../components/TranslationGroup/TranslationGroupsList';
import { ROUTES } from '../routes';
import { DocsButton } from '../../../components/docs/DocsButton';
import { Flex } from '@novu/novui/jsx';

export const TranslationGroupsPage = () => {
  const [page, setPage] = useState(0);
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const { translationGroups, isLoading, totalCount, pageSize } = useFetchTranslationGroups(page);
  const { getLocale } = useFetchLocales();
  const [defaultLocaleOpened, { close: closeDefaultLocale, open: openDefaultLocale }] = useDisclosure(false);

  const hasTranslationGroups = translationGroups && translationGroups.length > 0;
  const handlePageChange = (pageNumber: number) => {
    setPage(pageNumber);
  };

  const handleAddGroupButtonClick = () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (!currentOrganization!.defaultLocale) {
      openDefaultLocale();

      return;
    }
    navigate(ROUTES.TRANSLATION_GROUP_CREATE);
  };

  const onRowClick = (row: IRow<ITranslationGroup>) => {
    navigate(ROUTES.TRANSLATION_GROUP_EDIT.replace(':identifier', row.original.identifier));
  };

  const { readonly } = useEnvironment();

  return (
    <PageContainer>
      <Group position="apart" mx={24} mt={24} mb={16} align="center">
        <Flex align="center" gap="75">
          <Title size={2} data-test-id="translation-title">
            Translations
          </Title>
          <DocsButton />
        </Flex>

        <When truthy={currentOrganization && hasTranslationGroups}>
          <Group spacing={12} align="center">
            <Text color={colors.B60}>Default:</Text>
            <UnstyledButton
              onClick={() => {
                openDefaultLocale();
              }}
              disabled={readonly}
            >
              <Group spacing={4} align="center">
                <FlagIcon locale={currentOrganization?.defaultLocale || ''} />
                <Text>{getLocale(currentOrganization?.defaultLocale || '')?.langName}</Text>
              </Group>
            </UnstyledButton>
          </Group>
        </When>
      </Group>

      <When truthy={isLoading || hasTranslationGroups}>
        <Container fluid sx={{ padding: '8px 24px' }}>
          <TranslationGroupListToolbar
            isLoading={isLoading}
            onAddGroupClick={handleAddGroupButtonClick}
            readonly={readonly}
          />
        </Container>
        <TranslationGroupsList
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          data={translationGroups!}
          onRowClick={onRowClick}
          isLoading={isLoading}
          page={page}
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          pageSize={pageSize!}
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          totalCount={totalCount!}
          handlePageChange={handlePageChange}
        />
      </When>
      <When truthy={!hasTranslationGroups && !isLoading}>
        <TranslationGroupEmptyList handleAddGroupButtonClick={handleAddGroupButtonClick} readonly={readonly} />
      </When>

      <DefaultLocaleModal
        open={defaultLocaleOpened}
        onClose={closeDefaultLocale}
        onSave={() => {
          closeDefaultLocale();
          if (!hasTranslationGroups) {
            navigate(ROUTES.TRANSLATION_GROUP_CREATE);
          }
        }}
      />
      <Outlet />
    </PageContainer>
  );
};
