import { Button, Dropdown, Menu } from 'antd';
import { BuildOutlined, MenuOutlined, PlusOutlined } from '@ant-design/icons';
import styled from 'styled-components';

export function ControlBar({ top, onBlockAdd }: { top: number; onBlockAdd: (type: 'button' | 'text') => void }) {
  const menu = (
    <Menu>
      <Menu.Item key="control-bar-add">
        <Button
          icon={<BuildOutlined />}
          type="link"
          style={{ color: 'inherit' }}
          onClick={() => onBlockAdd('button')}
          data-test-id="add-btn-block">
          Add Button
        </Button>
      </Menu.Item>
      <Menu.Item key="add-text-button">
        <Button
          icon={<MenuOutlined />}
          type="link"
          style={{ color: 'inherit' }}
          onClick={() => onBlockAdd('text')}
          data-test-id="add-text-block">
          Add Text
        </Button>
      </Menu.Item>
    </Menu>
  );

  return (
    <ControlBarWrapper top={top} data-test-id="control-bar">
      <ButtonWrap>
        <Dropdown overlay={menu} arrow trigger={['click']}>
          <Button data-test-id="control-add" shape="circle" size="small" icon={<PlusOutlined />} />
        </Dropdown>
      </ButtonWrap>
    </ControlBarWrapper>
  );
}

const ButtonWrap = styled.div`
  position: relative;
  left: -29px;
  top: -12px;
  z-index: 1;

  span {
    font-size: 14px;
  }

  svg {
    position: relative;
    color: #909090;
  }

  &:hover {
    svg {
      color: #ff6f61;
    }
  }
`;

const ControlBarWrapper = styled.div<{ top: number }>`
  position: absolute;
  top: ${({ top }) => top}px;
  width: calc(100%);
  height: 1px;
  border-bottom: 1px dashed lightgrey;
  left: 0;
  z-index: 0;
`;
