import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Switch,
  Tooltip,
  Typography,
} from 'antd';
import {
  AlertTwoTone,
  CheckOutlined,
  CloseOutlined,
  MailTwoTone,
  MobileTwoTone,
  PlusCircleOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Controller, FormProvider } from 'react-hook-form';
import { useHistory } from 'react-router';

import styled, { css } from 'styled-components';
import { useParams } from 'react-router-dom';
import { ChannelTypeEnum } from '@notifire/shared';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { TemplateTriggerModal } from '../../../components/templates/TemplateTriggerModal';
import { TemplateInAppEditor } from '../../../components/templates/TemplateInAppEditor';
import { useTemplateController } from './use-template-controller.hook';
import { useStatusChangeControllerHook } from './use-status-change-controller.hook';
import { TriggerSnippetTabs } from '../../../components/templates/TriggerSnippetTabs';
import { EmailMessagesCards } from '../../../components/templates/EmailMessagesCards';
import { TemplateSMSEditor } from '../../../components/templates/TemplateSMSEditor';
import { useApplication } from '../../../../api/hooks/use-application';
import { getNotificationGroups } from '../../../../api/notifications';
import { api } from '../../../../api/api.client';

function TemplateEditorPage() {
  const {
    data: serverGroups,
    isLoading: loadingGroups,
    refetch: refetchGroups,
  } = useQuery('notificationGroups', getNotificationGroups);
  const { isLoading: loadingCreateGroup, mutateAsync: createNotificationGroup } = useMutation<
    { name: string; _id: string },
    { error: string; message: string; statusCode: number },
    {
      name: string;
    }
  >((data) => api.post(`/v1/notification-groups`, data));
  const router = useHistory();
  const [groups, setGroups] = useState<{ name: string; _id: string }[]>([]);
  const [categoryText, setCategoryText] = useState<string>();
  const { templateId } = useParams<{ templateId: string }>();
  const { application, loading: isLoadingApplication } = useApplication();

  const {
    selectedMessageType,
    editMode,
    template,
    changeSelectedMessage,
    isEmbedModalVisible,
    trigger,
    isLoading,
    isUpdateLoading,
    setValue,
    onSubmit,
    loadingEditTemplate,
    activeChannels,
    toggleChannel,
    onTriggerModalDismiss,
    addMessage,
    handleSubmit,
    control,
    emailMessagesFields,
    inAppFields,
    errors,
    smsFields,
    methods,
    removeEmailMessage,
  } = useTemplateController(templateId);

  const { isTemplateActive, changeActiveStatus, isStatusChangeLoading } = useStatusChangeControllerHook(
    templateId,
    template
  );

  useEffect(() => {
    if (serverGroups) {
      setGroups(serverGroups);
      if (!editMode && serverGroups?.length) {
        setValue('notificationGroup', serverGroups[0]._id);
      }
    }
  }, [serverGroups]);

  function navigateToSmsSettings() {
    router.push('/settings/widget?screen=sms');
  }

  async function addGroupItem() {
    if (categoryText) {
      const response = await createNotificationGroup({
        name: categoryText,
      });

      await refetchGroups();
      setCategoryText('');
      setValue('notificationGroup', response._id);
    }
  }

  if (isLoading) return null;

  return (
    <div>
      <FormProvider {...methods}>
        <div className="page-header-alt">
          <div className="container-fluid">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{editMode ? 'Edit template' : 'Create new template'}</h2>

              {editMode && (
                <StyledSwitch
                  data-test-id="active-toggle-switch"
                  loading={isStatusChangeLoading}
                  checkedChildren="Active"
                  unCheckedChildren="Disabled"
                  onChange={changeActiveStatus}
                  checked={isTemplateActive}
                />
              )}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Form layout="vertical" name="template-form" onFinish={handleSubmit(onSubmit)}>
            <Row>
              <Col md={24} className="mb-3">
                <Card loading={loadingEditTemplate}>
                  <Form.Item data-test-id="title" label="Name" validateStatus={errors?.name ? 'error' : ''}>
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => <Input {...field} placeholder="Notification name goes here" />}
                    />
                  </Form.Item>
                  <Form.Item data-test-id="description" label="Description">
                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => <Input {...field} placeholder="Describe your notification" />}
                    />
                  </Form.Item>
                  <Row gutter={15}>
                    <Col md={12}>
                      <Form.Item data-test-id="groupSelector" label="Notification Group">
                        <Controller
                          name="notificationGroup"
                          control={control}
                          render={({ field }) => (
                            <Select
                              {...field}
                              loading={loadingGroups}
                              notFoundContent={
                                <div style={{ textAlign: 'center', padding: '15px 0' }}>
                                  No group found, create your first
                                </div>
                              }
                              style={{ width: '100%' }}
                              placeholder="Attach notification to group"
                              dropdownRender={(menu) => (
                                <div>
                                  {menu}
                                  <Divider style={{ margin: '4px 0' }} />
                                  <div style={{ display: 'flex', flexWrap: 'nowrap', padding: 8 }}>
                                    <Input
                                      data-test-id="category-text-input"
                                      style={{ flex: 'auto' }}
                                      size="small"
                                      value={categoryText}
                                      onChange={(e) => setCategoryText(e.target.value)}
                                    />
                                    <Button
                                      data-test-id="submit-category-btn"
                                      loading={loadingCreateGroup}
                                      onClick={addGroupItem}
                                      type="link"
                                      style={{ flex: 'none', padding: '8px', display: 'block', cursor: 'pointer' }}>
                                      <PlusOutlined /> Create Group
                                    </Button>
                                  </div>
                                </div>
                              )}>
                              {(groups || []).map((item) => (
                                <Select.Option value={item._id} key={item.name}>
                                  {item.name}
                                </Select.Option>
                              ))}
                            </Select>
                          )}
                        />
                      </Form.Item>
                    </Col>
                    <Col md={12}>
                      <Form.Item data-test-id="tags" label="Tags">
                        <Controller
                          name="tags"
                          control={control}
                          render={({ field }) => (
                            <Select {...field} mode="tags" style={{ width: '100%' }} placeholder="Tags" />
                          )}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col md={24} className="mb-3">
                <Row gutter={16}>
                  <Col md={8}>
                    <StyledTypeCard
                      $active={activeChannels[ChannelTypeEnum.IN_APP]}
                      $focus={selectedMessageType === ChannelTypeEnum.IN_APP}
                      loading={loadingEditTemplate}>
                      <NotificationTypeButton
                        onClick={() => changeSelectedMessage(ChannelTypeEnum.IN_APP)}
                        data-test-id="inAppSelector">
                        <AlertTwoTone className="button-icon" twoToneColor="rgb(255, 76, 59)" />
                        <Typography.Title level={4}>In-App</Typography.Title>
                        <Switch
                          checked={activeChannels[ChannelTypeEnum.IN_APP]}
                          size="small"
                          onClick={(_, e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          checkedChildren={<CheckOutlined />}
                          unCheckedChildren={<CloseOutlined />}
                          onChange={(active) => toggleChannel(ChannelTypeEnum.IN_APP, active)}
                        />
                      </NotificationTypeButton>
                    </StyledTypeCard>
                  </Col>
                  <Col md={8}>
                    <StyledTypeCard
                      $active={activeChannels[ChannelTypeEnum.EMAIL]}
                      $focus={selectedMessageType === ChannelTypeEnum.EMAIL}
                      loading={loadingEditTemplate}>
                      <NotificationTypeButton
                        onClick={() => changeSelectedMessage(ChannelTypeEnum.EMAIL)}
                        data-test-id="emailSelector">
                        <MailTwoTone className="button-icon" twoToneColor="rgb(255, 76, 59)" />
                        <Typography.Title level={4}>E-mail</Typography.Title>
                        <Switch
                          checked={activeChannels[ChannelTypeEnum.EMAIL]}
                          size="small"
                          onClick={(_, e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          checkedChildren={<CheckOutlined />}
                          onChange={(active) => toggleChannel(ChannelTypeEnum.EMAIL, active)}
                          unCheckedChildren={<CloseOutlined />}
                        />
                      </NotificationTypeButton>
                    </StyledTypeCard>
                  </Col>
                  <Col md={8}>
                    <StyledTypeCard
                      $active={activeChannels[ChannelTypeEnum.SMS]}
                      $focus={selectedMessageType === ChannelTypeEnum.SMS}
                      loading={loadingEditTemplate}>
                      <NotificationTypeButton
                        onClick={() => {
                          if (application?.channels?.sms?.twillio?.accountSid) {
                            changeSelectedMessage(ChannelTypeEnum.SMS);
                          }
                        }}
                        data-test-id="smsSelector">
                        <MobileTwoTone className="button-icon" twoToneColor="rgb(255, 76, 59)" />
                        <Typography.Title level={4}>SMS</Typography.Title>
                        {application?.channels?.sms?.twillio?.accountSid && (
                          <Switch
                            checked={activeChannels[ChannelTypeEnum.SMS]}
                            size="small"
                            onClick={(_, e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            checkedChildren={<CheckOutlined />}
                            onChange={(active) => toggleChannel(ChannelTypeEnum.SMS, active)}
                            unCheckedChildren={<CloseOutlined />}
                          />
                        )}

                        {!application?.channels?.sms?.twillio?.accountSid && (
                          <Popconfirm
                            title={
                              <>
                                This action will navigate to the settings page, <br /> any unsaved changes will be
                                deleted. <br /> <br />
                                Proceed anyway?
                              </>
                            }
                            onConfirm={navigateToSmsSettings}
                            okText="Yes"
                            cancelText="No">
                            <Button size="small" data-test-id="configure-sms-button">
                              <SettingOutlined /> Configure
                            </Button>
                          </Popconfirm>
                        )}
                      </NotificationTypeButton>
                    </StyledTypeCard>
                  </Col>
                </Row>
              </Col>
            </Row>
            {loadingEditTemplate ? null : (
              <Row className="mb-3">
                {selectedMessageType === ChannelTypeEnum.SMS && activeChannels[ChannelTypeEnum.SMS]
                  ? smsFields.map((message, index) => {
                      return (
                        <Col md={24} data-test-id="sms-editor-wrapper" key={index}>
                          <TemplateSMSEditor errors={errors} control={control} index={index} />
                        </Col>
                      );
                    })
                  : null}

                {inAppFields.map((message, index) => {
                  return (
                    <Col
                      md={24}
                      data-test-id="in-app-editor-wrapper"
                      key={index}
                      style={{
                        display:
                          selectedMessageType === ChannelTypeEnum.IN_APP && activeChannels[ChannelTypeEnum.IN_APP]
                            ? 'block'
                            : 'none',
                      }}>
                      <TemplateInAppEditor errors={errors} control={control} index={index} />
                    </Col>
                  );
                })}

                <>
                  <Col
                    md={24}
                    data-test-id="email-editor-wrapper"
                    style={{
                      display:
                        selectedMessageType === ChannelTypeEnum.EMAIL && activeChannels[ChannelTypeEnum.EMAIL]
                          ? 'block'
                          : 'none',
                    }}>
                    <EmailMessagesCards
                      variables={trigger?.variables || []}
                      onRemoveTab={removeEmailMessage}
                      emailMessagesFields={emailMessagesFields}
                    />
                  </Col>

                  <Col
                    md={24}
                    style={{
                      display:
                        selectedMessageType === ChannelTypeEnum.EMAIL && activeChannels[ChannelTypeEnum.EMAIL]
                          ? 'block'
                          : 'none',
                    }}>
                    <AddMessageButtonWrapper>
                      <Tooltip title="Add another message with filters">
                        <StyledAddMessageButton
                          onClick={() => addMessage(ChannelTypeEnum.EMAIL)}
                          data-test-id="add-message-button"
                          size="large"
                          shape="circle"
                          icon={<PlusCircleOutlined />}
                        />
                      </Tooltip>
                    </AddMessageButtonWrapper>
                  </Col>
                </>
              </Row>
            )}
            {template && trigger && (
              <Row className="mb-3">
                <Col md={24}>
                  <Divider />
                  <Card title="Trigger snippet">
                    <TriggerSnippetTabs trigger={trigger} />
                  </Card>
                </Col>
              </Row>
            )}
            <Row>
              <Col md={24}>
                <Row justify="end">
                  <Col>
                    <Button
                      type="primary"
                      data-test-id="submit-btn"
                      htmlType="submit"
                      loading={isLoading || isUpdateLoading}
                      disabled={loadingEditTemplate || isLoading}>
                      {editMode ? 'Update' : 'Create'}
                    </Button>
                  </Col>
                </Row>
                {methods.formState.isDirty && methods.formState.isSubmitted && Object.keys(errors).length && (
                  <Row justify="center">
                    <Col>
                      <Alert message="Fill in all missing fields for enabled channels to save" type="warning" />
                    </Col>
                  </Row>
                )}
              </Col>
            </Row>
          </Form>

          {trigger && (
            <TemplateTriggerModal trigger={trigger} onDismiss={onTriggerModalDismiss} isVisible={isEmbedModalVisible} />
          )}
        </div>
      </FormProvider>
    </div>
  );
}

const EmailWrapper = styled.div<{ isVisible: boolean }>`
  display: ${({ isVisible }) => (isVisible ? 'block' : 'none')};
  width: 100%;
`;

const StyledTypeCard = styled(Card)<{ $active: boolean; $focus: boolean }>`
  ${({ $active }) =>
    $active
      ? css`
          ${NotificationTypeButton} {
            opacity: 1;
          }
        `
      : null}

  ${({ $focus }) =>
    $focus
      ? css`
          border: 1px solid #ff6f61;
        `
      : null}
`;

const StyledSwitch = styled(Switch)`
  &.ant-switch-checked {
    background-color: #04d182 !important;
  }
`;

const NotificationTypeButton = styled.div<{ active?: boolean }>`
  min-height: 130px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  opacity: 0.4;

  &:hover {
    cursor: pointer;
  }

  .button-icon {
    min-height: 50px;

    svg {
      font-size: 40px;
    }
  }
`;

const AddMessageButtonWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const StyledAddMessageButton = styled(Button)`
  background: transparent;
  margin-top: 15px;

  svg {
    color: grey;
    position: relative;
    top: 1px;
  }

  &:hover {
    svg {
      color: inherit;
    }
  }
`;

export default TemplateEditorPage;
