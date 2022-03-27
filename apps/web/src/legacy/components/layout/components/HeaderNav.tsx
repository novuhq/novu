import styled from 'styled-components';
import { Menu, Dropdown, Avatar, Layout, Button } from 'antd';
import { MenuUnfoldOutlined, SettingOutlined, LogoutOutlined, BellOutlined } from '@ant-design/icons';
import { useContext } from 'react';
import { AuthContext } from '../../../../store/authContext';
import { ThemeContext } from '../../../../store/themeContext';

const { Header } = Layout;

type Props = {};
const menuItem = [
  {
    title: 'Invite Members',
    icon: SettingOutlined,
    path: '/team',
  },
];

export function HeaderNav({}: Props) {
  const authContext = useContext(AuthContext);
  const themeContext = useContext(ThemeContext);

  return (
    <>
      <Header
        className="app-header"
        style={{
          padding: 0,
          display: 'flex',
          borderBottom: '1px solid #edf2f9',
          boxShadow: '0 1px 4px -1px rgb(0 0 0 / 15%)',
        }}>
        <div className="logo" style={{ width: 250, textAlign: 'center' }}>
          <img src="/static/images/logo.png" alt="logo" style={{ maxWidth: 150 }} />
        </div>
        <div className="nav" style={{ width: `calc(100% - 250px)`, display: 'flex' }}>
          <div className="nav-right" style={{ marginLeft: 'auto' }}>
            <Button onClick={() => themeContext.toggleTheme()}>TEST</Button>
            <div
              className="d-flex align-item-center"
              style={{ lineHeight: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Button id="notification-bell" shape="circle" icon={<BellOutlined />}>
                <StyledUnseenCounter id="unseen-badge-selector" />
              </Button>
            </div>
          </div>
        </div>
      </Header>
    </>
  );
}

const StyledUnseenCounter = styled.span`
  position: absolute !important;
`;
