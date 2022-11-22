import { useContext, useState } from 'react';
import { EmailContentCard } from './EmailContentCard';
import { AuthContext } from '../../../store/authContext';
import { When } from '../../utils/When';
import { Preview } from '../../../pages/templates/editor/Preview';
import { EditorPreviewSwitch } from '../EditorPreviewSwitch';
import { Grid } from '@mantine/core';

export function EmailMessagesCards({
  index,
  variables,
  isIntegrationActive,
}: {
  index: number;
  variables: { name: string }[];
  isIntegrationActive: boolean;
}) {
  const { currentOrganization } = useContext(AuthContext);
  const [view, setView] = useState<'Edit' | 'Preview'>('Edit');

  return (
    <>
      <Grid justify="center" mb={view === 'Preview' ? 40 : 20}>
        <EditorPreviewSwitch view={view} setView={setView} />
      </Grid>
      <When truthy={view === 'Preview'}>
        <Preview activeStep={index} />
      </When>
      <When truthy={view === 'Edit'}>
        <EmailContentCard
          key={index}
          organization={currentOrganization}
          variables={variables}
          index={index}
          isIntegrationActive={isIntegrationActive}
        />
      </When>
    </>
  );
}
