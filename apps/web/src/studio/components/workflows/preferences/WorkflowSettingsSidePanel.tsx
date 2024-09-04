import { FC } from 'react';

import { ChannelTypeEnum } from '@novu/shared';
import { Sidebar } from '@novu/design-system';
import { Preference, PreferenceChannel, SubscriptionPreferenceRow } from './types';
import { WorkflowSettingsSidePanelContent } from './WorkflowSettingsSidePanelContent';
import { Title } from '@novu/novui';

const MOCK_DATA: SubscriptionPreferenceRow[] = [
  { channel: 'workflow', defaultValue: true, readOnly: false },
  { channel: ChannelTypeEnum.IN_APP, defaultValue: true, readOnly: true },
  { channel: ChannelTypeEnum.EMAIL, defaultValue: false, readOnly: true },
  { channel: ChannelTypeEnum.SMS, defaultValue: true, readOnly: false },
  { channel: ChannelTypeEnum.PUSH, defaultValue: false, readOnly: true },
  { channel: ChannelTypeEnum.CHAT, defaultValue: true, readOnly: false },
];

type WorkflowSettingsSidePanelProps = { onClose: () => void };

export const WorkflowSettingsSidePanel: FC<WorkflowSettingsSidePanelProps> = ({ onClose }) => {
  const updateChannelPreferences = (prefs: Partial<Record<PreferenceChannel, Preference>>) => {
    return Promise.resolve();
  };

  return (
    <Sidebar customHeader={<Title variant="section">Workflow settings</Title>} isOpened onClose={onClose}>
      <WorkflowSettingsSidePanelContent preferences={MOCK_DATA} updateChannelPreferences={updateChannelPreferences} />
    </Sidebar>
  );
};
