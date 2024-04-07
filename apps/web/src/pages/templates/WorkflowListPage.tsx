import { ChangeEventHandler, useState } from 'react';
import { ActionIcon, useMantineTheme, Group } from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { format } from 'date-fns';
import {
  Tag,
  Table,
  colors,
  Text,
  IExtendedColumn,
  withCellLoading,
  Container,
  Bolt,
  BoltFilled,
  BoltOffFilled,
  Edit,
  ProviderMissing,
  Tooltip,
  SearchInput,
} from '@novu/design-system';

import {
  useTemplates,
  useEnvController,
  useNotificationGroup,
  INotificationTemplateExtended,
  useDebouncedSearch,
} from '../../hooks';
import { ROUTES } from '../../constants/routes.enum';
import { parseUrl } from '../../utils/routeUtils';
import { TemplatesListNoData } from './TemplatesListNoData';
import { useSegment } from '../../components/providers/SegmentProvider';
import { TemplateAnalyticsEnum } from './constants';
import { useTemplatesStoreModal } from './hooks/useTemplatesStoreModal';
import { useFetchBlueprints, useCreateTemplateFromBlueprint } from '../../api/hooks';
import { CreateWorkflowDropdown } from './components/CreateWorkflowDropdown';
import { IBlueprintTemplate } from '../../api/types';
import { errorMessage } from '../../utils/notifications';
import { TemplateCreationSourceEnum } from './shared';
import { When } from '../../components/utils/When';
import { ListPage } from '../../components/layout/components/ListPage';
import { WorkflowListNoMatches } from './WorkflowListNoMatches';

const columns: IExtendedColumn<INotificationTemplateExtended>[] = [
  {
    accessor: 'name',
    Header: 'Name & Trigger Identifier',
    width: 340,
    maxWidth: 340,
    Cell: withCellLoading(({ row: { original } }) => (
      <Group spacing={8}>
        <Group spacing={4}>
          <When truthy={original.chimera}>
            <Tooltip label="Workflow is handled by Echo" position="top">
              <div>
                <Bolt color="#4c6dd4" width="24px" height="24px" />
              </div>
            </Tooltip>
          </When>
          <Tooltip
            error
            label="Some steps are missing a provider configuration or a primary provider,
          causing some notifications to fail."
            width={300}
            multiline
            disabled={
              original.workflowIntegrationStatus?.hasActiveIntegrations &&
              original.workflowIntegrationStatus?.hasPrimaryIntegrations !== false
            }
            position="top"
          >
            <div>
              {original.workflowIntegrationStatus?.hasActiveIntegrations &&
              original.workflowIntegrationStatus?.hasPrimaryIntegrations !== false ? (
                !original.chimera ? (
                  <Bolt color={colors.B40} width="24px" height="24px" />
                ) : null
              ) : (
                <ProviderMissing width="24px" height="24px" />
              )}
            </div>
          </Tooltip>
        </Group>
        <Tooltip label={original.name}>
          <div>
            <Text rows={1} data-test-id="workflow-row-name">
              {original.name}
            </Text>
            <Text rows={1} size="xs" color={colors.B40} data-test-id="workflow-row-trigger-identifier">
              {original.triggers ? original.triggers[0].identifier : 'Unknown'}
            </Text>
          </div>
        </Tooltip>
      </Group>
    )),
  },
  {
    accessor: 'notificationGroup',
    Header: 'Group',
    width: 240,
    maxWidth: 240,
    Cell: withCellLoading(({ row: { original } }) =>
      original.chimera ? null : <StyledTag data-test-id="category-label"> {original.notificationGroup?.name}</StyledTag>
    ),
  },
  {
    accessor: 'createdAt',
    Header: 'Created At',
    width: 314,
    maxWidth: 314,
    Cell: withCellLoading(({ row: { original } }) => (
      <Text rows={1}>{format(new Date(original.createdAt ?? ''), 'dd/MM/yyyy HH:mm')}</Text>
    )),
  },
  {
    accessor: 'status',
    Header: 'Status',
    maxWidth: 100,
    Cell: withCellLoading(({ row: { original } }) => (
      <>
        {!original.active ? (
          <Group spacing={0} data-test-id="disabled-status-label">
            <BoltOffFilled color={colors.B40} />
            <Text rows={1} color={colors.B40}>
              Disabled
            </Text>
          </Group>
        ) : null}{' '}
        {original.active ? (
          <Group spacing={0} data-test-id="active-status-label">
            <BoltFilled color={colors.success} />
            <Text rows={1} color={colors.success}>
              Active
            </Text>
          </Group>
        ) : null}{' '}
      </>
    )),
  },
  {
    accessor: '_id',
    Header: '',
    maxWidth: 75,
    Cell: withCellLoading(({ row: { original } }) => {
      const theme = useMantineTheme();

      return (
        <ActionButtonWrapper>
          <ActionIcon
            variant="transparent"
            component={Link}
            to={parseUrl(ROUTES.WORKFLOWS_EDIT_TEMPLATEID, { templateId: original._id ?? '' })}
            data-test-id="template-edit-link"
          >
            <Edit color={theme.colorScheme === 'dark' ? colors.B40 : colors.B80} />
          </ActionIcon>
        </ActionButtonWrapper>
      );
    }),
  },
];

function WorkflowListPage() {
  const segment = useSegment();
  const { readonly } = useEnvController();
  const { loading: areNotificationGroupLoading } = useNotificationGroup();
  const {
    templates,
    loading: areWorkflowsLoading,
    isFetching,
    totalItemCount,
    totalPageCount,
    currentPageNumberQueryParam,
    pageSizeQueryParam,
    searchQueryParam,
    setSearchQueryParam,
    setCurrentPageNumberQueryParam,
    setPageSizeQueryParam,
  } = useTemplates({ areSearchParamsEnabled: true });
  const [searchValue, setSearchValue] = useState(searchQueryParam ?? '');
  const navigate = useNavigate();
  const { blueprintsGroupedAndPopular: { general, popular } = {}, isLoading: areBlueprintsLoading } =
    useFetchBlueprints();
  const { createTemplateFromBlueprint, isLoading: isCreatingTemplateFromBlueprint } = useCreateTemplateFromBlueprint({
    onSuccess: (template) => {
      navigate(`${parseUrl(ROUTES.WORKFLOWS_EDIT_TEMPLATEID, { templateId: template._id ?? '' })}`);
    },
    onError: () => {
      errorMessage('Something went wrong while creating template from blueprint, please try again later.');
    },
  });
  const hasGroups = general && general.length > 0;
  const hasTemplates = templates && templates.length > 0;
  const isLoading = areNotificationGroupLoading || areWorkflowsLoading;
  const shouldShowEmptyState = !isLoading && !isFetching && !hasTemplates && searchValue === '';
  const shouldShowNoResults = !isLoading && !isFetching && !hasTemplates && searchValue !== '';
  const isSearchInputDisabled = isLoading || (!hasTemplates && searchValue === '');

  const { TemplatesStoreModal, openModal } = useTemplatesStoreModal({ general, popular });

  function handleTableChange(pageIndex: number) {
    setCurrentPageNumberQueryParam(pageIndex);
  }

  const handleRedirectToCreateTemplate = (isFromHeader: boolean) => {
    segment.track(TemplateAnalyticsEnum.CREATE_TEMPLATE_CLICK, { isFromHeader });
    navigate(ROUTES.WORKFLOWS_CREATE);
  };

  const handleOnBlueprintClick = (blueprint: IBlueprintTemplate) => {
    createTemplateFromBlueprint({
      blueprint: { ...blueprint },
      params: { __source: TemplateCreationSourceEnum.TEMPLATE_STORE },
    });
  };

  function onRowClick(row) {
    navigate(parseUrl(ROUTES.WORKFLOWS_EDIT_TEMPLATEID, { templateId: row.values._id }));
  }

  const debouncedSearchChange = useDebouncedSearch(setSearchQueryParam);

  const onSearchClearClick = () => {
    debouncedSearchChange.cancel();
    setSearchValue('');
    setSearchQueryParam('');
  };

  const onSearchChange: ChangeEventHandler<HTMLInputElement> = ({ target: { value } }) => {
    if (value === '') {
      onSearchClearClick();

      return;
    }
    setSearchValue(value);
    debouncedSearchChange(value);
  };

  return (
    <ListPage
      title="Workflows"
      paginationInfo={{
        totalItemCount,
        pageSize: pageSizeQueryParam,
        totalPageCount,
        currentPageNumber: currentPageNumberQueryParam,
        onPageChange: handleTableChange,
        onPageSizeChange: setPageSizeQueryParam,
      }}
    >
      <Container fluid sx={{ padding: '0 24px 8px 24px' }}>
        <TableActionsContainer>
          <CreateWorkflowDropdown
            readonly={readonly}
            blueprints={popular?.blueprints}
            isLoading={areBlueprintsLoading}
            isCreating={isCreatingTemplateFromBlueprint}
            allTemplatesDisabled={areBlueprintsLoading || !hasGroups}
            onBlankWorkflowClick={() => handleRedirectToCreateTemplate(false)}
            onTemplateClick={handleOnBlueprintClick}
            onAllTemplatesClick={openModal}
          />
          <SearchInput
            value={searchValue}
            placeholder="Type name or identifier..."
            onChange={onSearchChange}
            onClearClick={onSearchClearClick}
            disabled={isSearchInputDisabled}
            data-test-id="workflows-search-input"
          />
        </TableActionsContainer>
      </Container>
      <TemplateListTableWrapper>
        <When truthy={!shouldShowEmptyState}>
          <Table
            onRowClick={onRowClick}
            loading={isLoading}
            data-test-id="notifications-template"
            columns={columns}
            data={templates}
            noDataPlaceholder={shouldShowNoResults && <WorkflowListNoMatches />}
          />
        </When>
        <When truthy={shouldShowEmptyState}>
          <TemplatesListNoData
            readonly={readonly}
            blueprints={popular?.blueprints}
            isLoading={areBlueprintsLoading}
            isCreating={isCreatingTemplateFromBlueprint}
            allTemplatesDisabled={areBlueprintsLoading || !hasGroups}
            onBlankWorkflowClick={() => handleRedirectToCreateTemplate(false)}
            onTemplateClick={handleOnBlueprintClick}
            onAllTemplatesClick={openModal}
          />
        </When>
        <TemplatesStoreModal />
      </TemplateListTableWrapper>
    </ListPage>
  );
}

export default WorkflowListPage;

const ActionButtonWrapper = styled.div`
  text-align: right;
  padding-right: 8px;
  a {
    display: inline-block;
    opacity: 0;
    transition: opacity 0.1s ease-in;
  }
`;

const TemplateListTableWrapper = styled.div`
  tr:hover {
    ${ActionButtonWrapper} {
      a {
        opacity: 1;
      }
    }
  }
`;

const StyledTag = styled(Tag)`
  max-width: 100%;

  span {
    max-width: 100%;
  }
`;

const TableActionsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
