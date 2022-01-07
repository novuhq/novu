import styled from 'styled-components';
import { Menu, Dropdown, Avatar, Layout, Button } from 'antd';
import { MenuUnfoldOutlined, SettingOutlined, LogoutOutlined, BellOutlined } from '@ant-design/icons';
import { useQuery } from 'react-query';
import { IOrganizationEntity, IUserEntity } from '@notifire/shared';
import { useContext } from 'react';
import * as capitalize from 'lodash.capitalize';
import { AuthContext } from '../../../store/authContext';
import { getUser } from '../../../api/user';
import { getCurrentOrganization } from '../../../api/organization';
import { ThemeContext } from '../../../store/themeContext';

const { Header } = Layout;

type Props = {};
const menuItem = [
  {
    title: 'Invite Members',
    icon: SettingOutlined,
    path: '/settings/organization',
  },
];

export function HeaderNav({}: Props) {
  const authContext = useContext(AuthContext);
  const themeContext = useContext(ThemeContext);
  const { data: user, isLoading: isUserLoading } = useQuery<IUserEntity>('/v1/users/me', getUser);
  const { data: organization, isLoading: isOrganizationLoading } = useQuery<IOrganizationEntity>(
    '/v1/organizations/me',
    getCurrentOrganization
  );

  const profileMenu = (
    <div className="nav-profile nav-dropdown">
      <div className="nav-profile-header">
        <div className="d-flex" style={{ display: 'flex' }}>
          <Avatar style={{ minWidth: 45 }} size={45} src={user?.profilePicture || '/static/images/avatar.png'} />
          <div className="pl-3">
            <h4 className="mb-0" data-test-id="header-dropdown-username">
              {capitalize(user?.firstName as string)} {capitalize(user?.lastName as string)}
            </h4>
            <span className="text-muted" data-test-id="header-dropdown-organization-name">
              {capitalize(organization?.name as string)}
            </span>
          </div>
        </div>
      </div>
      <div className="nav-profile-body">
        <Menu>
          {menuItem.map((el, i) => {
            return (
              <Menu.Item key={i}>
                <a href={el.path}>
                  <span className="font-weight-normal">{el.title}</span>
                </a>
              </Menu.Item>
            );
          })}

          <Menu.Item key={menuItem.length + 1} onClick={authContext.logout} data-test-id="logout-button">
            <span>
              <LogoutOutlined className="mr-3" />
              <span className="font-weight-normal">Sign Out</span>
            </span>
          </Menu.Item>
        </Menu>
      </div>
    </div>
  );

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

            <Dropdown placement="bottomRight" overlay={profileMenu} trigger={['click']}>
              <Menu className="d-flex align-item-center" mode="horizontal">
                <Menu.Item key="avatar">
                  <Avatar
                    data-test-id="header-profile-avatar"
                    src={user?.profilePicture || '/static/images/avatar.png'}
                  />
                </Menu.Item>
              </Menu>
            </Dropdown>
          </div>
        </div>
      </Header>
    </>
  );
}

const StyledUnseenCounter = styled.span`
  position: absolute !important;
`;
