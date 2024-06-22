import { useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

import { Select, IconConstruction, IconRocketLaunch } from '@novu/design-system';

import { css } from '@novu/novui/css';
import { navSelectStyles } from '../NavSelect.styles';
import { EnvironmentPopover } from './EnvironmentPopover';
import { useEnvironment } from '../../../hooks';
import { ROUTES } from '../../../constants/routes';
import { BaseEnvironmentEnum } from '../../../constants/BaseEnvironmentEnum';

function checkIfEnvBasedRoute() {
  return [ROUTES.API_KEYS, ROUTES.WEBHOOK].some((route) => matchPath(route, window.location.pathname));
}

export function EnvironmentSelect() {
  const [isPopoverOpened, setIsPopoverOpened] = useState<boolean>(false);
  const location = useLocation();
  const { environment, environments, isLoading, switchEnvironment, switchToDevelopmentEnvironment } = useEnvironment();

  async function handlePopoverLinkClick(e) {
    e.preventDefault();
    await switchToDevelopmentEnvironment(ROUTES.CHANGES);
  }

  const onChange = async (value) => {
    if (typeof value !== 'string') {
      return;
    }

    /*
     * this navigates users to the "base" page of the application to avoid sub-pages opened with data from other
     * environments -- unless the path itself is based on a specific environment (e.g. API Keys)
     */
    const urlParts = location.pathname.replace('/', '').split('/');
    const redirectRoute = checkIfEnvBasedRoute() ? undefined : urlParts[0];
    await switchEnvironment(value, redirectRoute);
  };

  return (
    // TODO: Restore the popover logic
    <EnvironmentPopover
      isPopoverOpened={isPopoverOpened}
      setIsPopoverOpened={setIsPopoverOpened}
      handlePopoverLinkClick={handlePopoverLinkClick}
    >
      <Select
        className={navSelectStyles}
        data-test-id="environment-switch"
        allowDeselect={false}
        loading={isLoading}
        value={environment?._id}
        data={(environments || []).map(({ _id: value, name: label }) => ({ label, value }))}
        onChange={onChange}
        icon={
          !isLoading && (
            <span
              className={css({
                p: '50',
                // TODO: use design system values when available
                borderRadius: '8px',
                bg: 'surface.page',
                '& svg': {
                  fill: 'typography.text.main',
                },
                _after: {
                  width: '100',
                },
              })}
            >
              {environment?.name === BaseEnvironmentEnum.DEVELOPMENT ? <IconConstruction /> : <IconRocketLaunch />}
            </span>
          )
        }
      />
    </EnvironmentPopover>
  );
}
