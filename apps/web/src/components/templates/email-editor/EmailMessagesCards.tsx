import { useContext, useState } from 'react';

import { EmailContentCard } from './EmailContentCard';
import { AuthContext } from '../../../store/authContext';
import { When } from '../../utils/When';
import { Preview } from '../../../pages/templates/editor/Preview';
import { EditorPreviewSwitch } from '../EditorPreviewSwitch';
import { Grid } from '@mantine/core';
import { TestSendEmail } from './TestSendEmail';

export enum ViewEnum {
  EDIT = 'Edit',
  PREVIEW = 'Preview',
  TEST = 'Test',
}

export function EmailMessagesCards({ index, isIntegrationActive }: { index: number; isIntegrationActive: boolean }) {
  const { currentOrganization } = useContext(AuthContext);
  const [view, setView] = useState<ViewEnum>(ViewEnum.EDIT);

  return (
    <>
      <Grid justify="center" mb={view === ViewEnum.PREVIEW ? 40 : 20}>
        <EditorPreviewSwitch view={view} setView={setView} />
      </Grid>
      <When truthy={view === ViewEnum.PREVIEW}>
        <Preview activeStep={index} />
      </When>
      <When truthy={view === ViewEnum.TEST}>
        <TestSendEmail isIntegrationActive={isIntegrationActive} index={index} />
      </When>
      <When truthy={view === ViewEnum.EDIT}>
        <EmailContentCard
          key={index}
          organization={currentOrganization}
          index={index}
          isIntegrationActive={isIntegrationActive}
        />
      </When>
    </>
  );
}
