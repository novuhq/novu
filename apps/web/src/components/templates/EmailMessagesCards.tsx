import { FieldArrayWithId, useFormContext } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Button, Collapse, Popconfirm } from 'antd';
import { MinusCircleOutlined } from '@ant-design/icons';
import styled, { css } from 'styled-components';
import { useQuery } from 'react-query';
import { IApplication } from '@notifire/shared';
import { MessageNameEditorHeader } from './MessageNameEditorHeader';
import { EmailContentCard } from './EmailContentCard';
import { IForm } from '../../pages/templates/editor/use-template-controller.hook';
import { getCurrentApplication } from '../../api/application';

export function EmailMessagesCards({
  emailMessagesFields,
  onRemoveTab,
  variables,
}: {
  emailMessagesFields: FieldArrayWithId<IForm, 'emailMessages'>[];
  onRemoveTab: (index: number) => void;
  variables: { name: string }[];
}) {
  const { data: application } = useQuery<IApplication>('currentApplication', getCurrentApplication);

  const [activeTab, setActiveTab] = useState<string[] | string>();

  useEffect(() => {
    const messageToSelect = emailMessagesFields[emailMessagesFields.length - 1];

    if (messageToSelect) {
      setActiveTab(messageToSelect.id);
    }
  }, [emailMessagesFields]);

  const showCollapse = emailMessagesFields.length !== 1;
  const collapseProps: { expandIcon?: () => null; ghost?: boolean } = {};
  if (!showCollapse) {
    collapseProps.expandIcon = () => null;
    collapseProps.ghost = true;
  }

  useEffect(() => {
    setActiveTab(null as any);
    setTimeout(() => {
      const messageToSelect = emailMessagesFields[emailMessagesFields.length - 1];

      if (messageToSelect) {
        setActiveTab(messageToSelect.id);
      }
    }, 100);
  }, [emailMessagesFields]);

  if (!emailMessagesFields?.length) {
    return null;
  }

  return (
    <>
      <CollapseWrapper showCollapse={showCollapse}>
        <Collapse
          {...collapseProps}
          accordion
          destroyInactivePanel
          activeKey={activeTab || emailMessagesFields[0]?.id}
          defaultActiveKey={activeTab || emailMessagesFields[0]?.id}
          style={{ width: '100%' }}
          onChange={(id) => (emailMessagesFields?.length === 1 ? id && setActiveTab(id) : setActiveTab(id))}>
          {emailMessagesFields.map((message, index) => {
            return (
              <Collapse.Panel
                forceRender
                extra={
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}>
                    <Popconfirm
                      title="Are you sure to delete this message?"
                      onConfirm={() => onRemoveTab(index)}
                      okText="Yes"
                      cancelText="No">
                      <Button
                        type="link"
                        data-test-id="remove-message-template-btn"
                        icon={<MinusCircleOutlined />}
                        size="small"
                      />
                    </Popconfirm>
                  </div>
                }
                header={
                  showCollapse && (
                    <MessageNameEditorHeader selector={`emailMessages.${index}.template.name`} message={message} />
                  )
                }
                id={message.id}
                key={message.id}>
                <EmailContentCard
                  application={application}
                  variables={variables}
                  index={index}
                  showFilters={showCollapse}
                />
              </Collapse.Panel>
            );
          })}
        </Collapse>
      </CollapseWrapper>
    </>
  );
}

const CollapseWrapper = styled.div<{ showCollapse: boolean }>`
  ${({ showCollapse }) =>
    showCollapse
      ? null
      : css`
          .ant-collapse-header {
            display: none;
          }

          .ant-collapse-content-box {
            padding-left: 0;
            padding-right: 0;
          }
        `}
`;
