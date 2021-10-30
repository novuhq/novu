import styled from 'styled-components';
import { Menu } from 'antd';

type Props = {};

export function TopNav({}: Props) {
  return (
    <>
      <div className="top-nav light">
        <div className="top-nav-wrapper">
          <Menu mode="horizontal">
            <Menu.Item>
              <span>Test Path</span>
            </Menu.Item>
          </Menu>
        </div>
      </div>
    </>
  );
}
