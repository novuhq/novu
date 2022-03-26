import { Layout, Menu } from 'antd';
import { Scrollbars } from 'react-custom-scrollbars';
import { NavLink } from 'react-router-dom';
import { SettingOutlined, NotificationOutlined, MonitorOutlined, TeamOutlined } from '@ant-design/icons';
import { useContext } from 'react';
import { ThemeContext } from '../../../../store/themeContext';

const { Sider } = Layout;

type Props = {};

export function SideNav({}: Props) {
  const themeContext = useContext(ThemeContext);

  return (
    <Sider className="side-nav" width={250} collapsed={false} theme={themeContext.theme}>
      <Scrollbars autoHide>
        <Menu mode="inline">
          <Menu.Item icon={<NotificationOutlined />} key="templates">
            <NavLink to="/templates" className="nav-text" data-test-id="side-nav-templates-link">
              <span>Notifications</span>
            </NavLink>
          </Menu.Item>
          <Menu.Item icon={<MonitorOutlined />} key="activities">
            <NavLink to="/activities" className="nav-text" data-test-id="side-nav-activities-link">
              <span>Activity Feed</span>
            </NavLink>
          </Menu.Item>
          <Menu.Item icon={<SettingOutlined />} key="integrations">
            <NavLink to="/integrations" className="nav-text" data-test-id="side-nav-settings-link">
              <span>Integration Store</span>
            </NavLink>
          </Menu.Item>
          <Menu.Item icon={<SettingOutlined />} key="settings">
            <NavLink to="/settings" className="nav-text" data-test-id="side-nav-settings-link">
              <span>Settings</span>
            </NavLink>
          </Menu.Item>
          <Menu.Item icon={<TeamOutlined />} key="members">
            <NavLink to="/settings/organization" className="nav-text" data-test-id="side-nav-settings-organization">
              <span>Team Members</span>
            </NavLink>
          </Menu.Item>
        </Menu>
      </Scrollbars>
    </Sider>
  );
}
