import { useState } from 'react';
import { Badge, ActionIcon, useMantineTheme } from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { format } from 'date-fns';

import {
  useTemplates,
  useEnvController,
  useNotificationGroup,
  useIsTemplateStoreEnabled,
  INotificationTemplateExtended,
} from '../../hooks';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Tag, Table, colors, Text, Button, IExtendedColumn, withCellLoading } from '../../design-system';
import { Edit, PlusCircle } from '../../design-system/icons';
import { Tooltip } from '../../design-system';
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

const columns: IExtendedColumn<INotificationTemplateExtended>[] = [
  {
    accessor: 'id',
    Header: 'Trigger ID',
    Cell: withCellLoading(({ row: { original } }) => (
      <Tooltip label={original.triggers ? original.triggers[0].identifier : 'Unknown'}>
        <Text rows={1}>{original.triggers ? original.triggers[0].identifier : 'Unknown'}</Text>
      </Tooltip>
    )),
  },
  {
    accessor: 'name',
    Header: 'Name',
    Cell: withCellLoading(({ row: { original } }) => (
      <Tooltip label={original.name}>
        <Text rows={1}>{original.name}</Text>
      </Tooltip>
    )),
  },
  {
    accessor: 'notificationGroup',
    Header: 'Category',
    width: 150,
    maxWidth: 150,
    Cell: withCellLoading(({ row: { original } }) => (
      <StyledTag data-test-id="category-label"> {original.notificationGroup?.name}</StyledTag>
    )),
  },
  {
    accessor: 'createdAt',
    Header: 'Created At',
    Cell: withCellLoading(({ row: { original } }) => (
      <Text rows={1}>{format(new Date(original.createdAt ?? ''), 'dd/MM/yyyy HH:mm')}</Text>
    )),
  },
  {
    accessor: 'status',
    Header: 'Status',
    width: 125,
    maxWidth: 125,
    Cell: withCellLoading(({ row: { original } }) => (
      <>
        {!original.active ? (
          <Badge variant="outline" size="md" color="yellow">
            Disabled
          </Badge>
        ) : null}{' '}
        {original.active ? (
          <Badge variant="outline" size="md" color="green" data-test-id="active-status-label">
            Active
          </Badge>
        ) : null}{' '}
      </>
    )),
  },
  {
    accessor: '_id',
    Header: '',
    maxWidth: 50,
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
  const [page, setPage] = useState<number>(0);
  const { loading: areNotificationGroupLoading } = useNotificationGroup();
  const { templates, loading, totalCount: totalTemplatesCount, pageSize } = useTemplates(page);
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
  const isTemplateStoreEnabled = useIsTemplateStoreEnabled();

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
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
    <PageContainer title="Workflows">
      <PageHeader
        title="Workflows"
        actions={
          isTemplateStoreEnabled ? (
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
          ) : (
            <Button
              disabled={readonly}
              onClick={() => handleRedirectToCreateTemplate(true)}
              icon={<PlusCircle />}
              data-test-id="create-template-btn"
            >
              Create Workflow
            </Button>
          )
        }
      />

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
                pagination={{
                  pageSize: pageSize,
                  current: page,
                  total: totalTemplatesCount,
                  onPageChange: handleTableChange,
                }}
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
            pagination={{
              pageSize: pageSize,
              current: page,
              total: totalTemplatesCount,
              onPageChange: handleTableChange,
            }}
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
    </PageContainer>
  );
}

export default WorkflowListPage;

const ActionButtonWrapper = styled.div`
  text-align: right;

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
