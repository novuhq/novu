import { FC } from 'react';

import { Drawer } from '@mantine/core';
import { WorkflowSubscriptionPreferences } from './WorkflowSubscriptionPreferences';

type WorkflowSettingsSidePanelProps = {};
export const WorkflowSettingsSidePanel: FC<WorkflowSettingsSidePanelProps> = (props) => {
  return (
    <Drawer opened onClose={() => {}}>
      <WorkflowSubscriptionPreferences />
    </Drawer>
  );
};
