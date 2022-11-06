import { Component, h, getAssetPath } from '@stencil/core';
import { css } from '@emotion/css';

// import { getTheme } from '../../theme';
import { IUserPreferenceSettings } from '../../types';

const noSettingsStyles = css`
  text-align: center;
  min-height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

@Component({
  tag: 'subscriber-preferences-list',
  assetsDirs: ['assets'],
})
export class SubscriberPreferencesList {
  render() {
    // const theme = getTheme();
    // const baseTheme = theme?.userPreferences;
    // TODO: fetch preferences
    const isLoading = false;
    // const loadingUpdate = false;
    const data: IUserPreferenceSettings[] = [
      {
        template: {
          _id: '62e45b3547e36b1f86499c4e',
          name: 'asd',
          critical: false,
        },
        preference: {
          enabled: true,
          channels: {
            email: true,
            in_app: true,
          },
        },
      },
      {
        template: {
          _id: '63278a8420228d379ef5ccac',
          name: 'not',
          critical: false,
        },
        preference: {
          enabled: true,
          channels: {
            in_app: true,
          },
        },
      },
      {
        template: {
          _id: '63278b1420228d379ef5cde9',
          name: 'notification2221',
          critical: false,
        },
        preference: {
          enabled: true,
          channels: {
            in_app: true,
          },
        },
      },
      {
        template: {
          _id: '62e00e7e3c36d8591d8fb78d',
          name: 'test',
          critical: false,
        },
        preference: {
          enabled: true,
          channels: {
            in_app: true,
          },
        },
      },
    ];
    const preferences = data
      ?.filter((item) => !item.template.critical)
      ?.filter((pref) => Object.keys(pref.preference.channels).length > 0);

    if (!isLoading && preferences?.length === 0) {
      return (
        <div class={noSettingsStyles}>
          <img src={getAssetPath('../../assets/no-settings.png')} style={{ width: '300px' }} alt="no settings" />
        </div>
      );
    }

    return (
      <div style={{ padding: '15px' }}>
        <div>
          {preferences.map((setting, index) => (
            <accordion-component
              key={index}
              header={<workflow-header setting={setting} />}
              body={<channel-preferences setting={setting} />}
              dataTestId="workflow-list-item"
            />
          ))}
        </div>
      </div>
    );
  }
}
