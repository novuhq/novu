import { ActionIcon, useMantineTheme, Group } from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { format } from 'date-fns';

import {
  useTemplates,
  useEnvController,
  useNotificationGroup,
  useFeatureFlag,
  INotificationTemplateExtended,
} from '../../hooks';
import {
  Tag,
  Table,
  colors,
  Text,
  IExtendedColumn,
  withCellLoading,
  PlusButton,
  Container,
  Bolt,
  BoltFilled,
  BoltOffFilled,
  Edit,
  ProviderMissing,
  Tooltip,
} from '@novu/design-system';
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
import { TemplatesListNoDataOld } from './TemplatesListNoDataOld';
import { useCreateDigestDemoWorkflow } from '../../api/hooks/notification-templates/useCreateDigestDemoWorkflow';
import { When } from '../../components/utils/When';
import { ListPage } from '../../components/layout/components/ListPage';
import { FeatureFlagsKeysEnum } from '@novu/shared';

const columns: IExtendedColumn<INotificationTemplateExtended>[] = [
  {
    accessor: 'name',
    Header: 'Name & Trigger Identifier',
    width: 340,
    maxWidth: 340,
    Cell: withCellLoading(({ row: { original } }) => (
      <Group spacing={8}>
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
              <Bolt color={colors.B40} width="24px" height="24px" />
            ) : (
              <ProviderMissing width="24px" height="24px" />
            )}
          </div>
        </Tooltip>

        <Tooltip label={original.name}>
          <div>
            <Text rows={1}>{original.name}</Text>
            <Text rows={1} size="xs" color={colors.B40}>
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
    Cell: withCellLoading(({ row: { original } }) => (
      <StyledTag data-test-id="category-label"> {original.notificationGroup?.name}</StyledTag>
    )),
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
    loading,
    totalItemCount,
    totalPageCount,
    currentPageNumber,
    setCurrentPageNumber,
    setPageSize,
    pageSize,
  } = useTemplates({ areSearchParamsEnabled: true });
  const isLoading = areNotificationGroupLoading || loading;
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

  const { TemplatesStoreModal, openModal } = useTemplatesStoreModal({ general, popular });
  const { createDigestDemoWorkflow, isDisabled: isTryDigestDisabled } = useCreateDigestDemoWorkflow();
  const isTemplateStoreEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TEMPLATE_STORE_ENABLED);

  function handleTableChange(pageIndex: number) {
    setCurrentPageNumber(pageIndex);
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

  const handleCreateDigestDemoWorkflow = () => {
    segment.track(TemplateAnalyticsEnum.TRY_DIGEST_CLICK);
    createDigestDemoWorkflow();
  };

  function onRowClick(row) {
    navigate(parseUrl(ROUTES.WORKFLOWS_EDIT_TEMPLATEID, { templateId: row.values._id }));
  }

  return (
    <ListPage
      title="Workflows"
      paginationInfo={{
        totalItemCount,
        pageSize,
        totalPageCount,
        currentPageNumber,
        onPageChange: handleTableChange,
        onPageSizeChange: setPageSize,
      }}
    >
      <Container fluid sx={{ padding: '0 24px 8px 24px' }}>
        {isTemplateStoreEnabled ? (
          <div>
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
          </div>
        ) : (
          <>
            <PlusButton
              label="Add a workflow"
              disabled={readonly}
              onClick={() => handleRedirectToCreateTemplate(true)}
              data-test-id="create-workflow-btn"
            />
          </>
        )}
      </Container>

      <TemplateListTableWrapper>
        {isTemplateStoreEnabled ? (
          <>
            <When truthy={hasTemplates}>
              <Table
                onRowClick={onRowClick}
                loading={isLoading}
                data-test-id="notifications-template"
                columns={columns}
                data={templates}
              />
            </When>
            <When truthy={!hasTemplates}>
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
          </>
        ) : (
          <Table
            onRowClick={onRowClick}
            loading={isLoading}
            data-test-id="notifications-template"
            columns={columns}
            data={templates}
            noDataPlaceholder={
              <TemplatesListNoDataOld
                onCreateClick={() => handleRedirectToCreateTemplate(false)}
                onTryDigestClick={handleCreateDigestDemoWorkflow}
                tryDigestDisabled={isTryDigestDisabled}
              />
            }
          />
        )}
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
