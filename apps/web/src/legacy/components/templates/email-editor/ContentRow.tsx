import styled from 'styled-components';
import { Button, Col, Drawer, Dropdown, Form, Input, Menu, Radio, Row } from 'antd';
import { EllipsisOutlined, SettingOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import { IEmailBlock } from '@notifire/shared';

export function ContentRow({
  children,
  onHoverElement,
  onRemove,
  allowRemove,
  block,
  onStyleChanged,
}: {
  children: JSX.Element | JSX.Element[];
  onHoverElement: (data: { top: number; height: number }) => void;
  onRemove: () => void;
  allowRemove: boolean;
  block: IEmailBlock;
  onStyleChanged: (data: { textDirection: 'ltr' | 'rtl' }) => void;
}) {
  const [form] = Form.useForm();

  const [drawerVisible, setDrawerVisible] = useState<boolean>();
  const parentRef = useRef<HTMLDivElement>(null);
  function onHover() {
    if (!parentRef.current) return;

    onHoverElement({
      top: parentRef.current.offsetTop,
      height: parentRef.current.offsetHeight,
    });
  }

  const menu = (
    <Menu>
      <Menu.Item data-test-id="style-setting-row-btn-drawer" key="0" onClick={() => setDrawerVisible(true)}>
        Style Settings
      </Menu.Item>
      {allowRemove && (
        <>
          <Menu.Divider />
          <Menu.Item data-test-id="remove-row-btn" key="3" onClick={onRemove}>
            Remove Row
          </Menu.Item>
        </>
      )}
    </Menu>
  );

  function submitRowStyles() {
    setDrawerVisible(false);
    onStyleChanged({
      textDirection: form.getFieldsValue().textDirection,
    });
  }

  return (
    <>
      <div onMouseEnter={onHover} ref={parentRef} data-test-id="editor-row">
        <ContentRowWrapper>
          <div style={{ width: 'calc(100% - 20px)' }}>{children}</div>
          <div>
            <Dropdown overlay={menu} trigger={['click']}>
              <SettingsButton
                data-test-id="settings-row-btn"
                size="small"
                shape="circle"
                icon={<EllipsisOutlined rotate={180} />}
              />
            </Dropdown>
          </div>
        </ContentRowWrapper>
      </div>

      <Drawer
        title="Row Style Settings"
        width={300}
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
        bodyStyle={{ paddingBottom: 80 }}
        footer={
          <div
            style={{
              textAlign: 'right',
            }}>
            <Button onClick={() => setDrawerVisible(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button data-test-id="drawer-submit-btn" htmlType="submit" onClick={submitRowStyles} type="primary">
              Save
            </Button>
          </div>
        }>
        <Form
          form={form}
          initialValues={{
            textDirection: block?.styles?.textDirection || 'ltr',
          }}
          layout="vertical"
          hideRequiredMark>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="textDirection" label="Text Direction" data-test-id="text-direction-input">
                <Radio.Group
                  optionType="button"
                  options={[
                    { label: 'LTR', value: 'ltr' },
                    { label: 'RTL', value: 'rtl' },
                  ]}
                  value="ltr"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </>
  );
}

const SettingsButton = styled(Button)`
  display: none;
  right: -10px;
  position: absolute;
`;

const StyledButton = styled(Button)`
  display: none;
  right: -25px;
  position: absolute;
`;

const ContentRowWrapper = styled.div`
  width: 100%;
  outline: transparent;
  padding-bottom: 10px;
  display: flex;

  &:hover {
    ${StyledButton} {
      display: inline-block;
    }

    ${SettingsButton} {
      display: inline-block;
    }
  }
`;
