import { useState } from 'react';
import { Stack, Group, Box } from '@mantine/core';
import { useQuery, useMutation } from 'react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  completeVercelIntegration,
  getVercelConfigurationDetails,
  getVercelProjects,
  updateVercelIntegration,
} from '../../../api/vercel-integration';
import { useVercelParams } from '../../../hooks/use-vercelParams';
import { LinkMoreProjectRow } from './LinkMoreProjectRow';
import { ProjectRow } from './ProjectRow';
import { Text, colors, Button } from '../../../design-system';
import { useAuthController } from '../../../store/use-auth-controller';
import VercelSetupLoader from '../../auth/VercelSetupLoader';
import { errorMessage, successMessage } from '../../../utils/notifications';

export type ProjectLinkFormValues = {
  projectLinkState: {
    projectIds: string[];
    organizationId: string;
  }[];
};

export function LinkProjectContainer({ type }: { type: 'edit' | 'create' }) {
  const { organizations } = useAuthController();
  const { configurationId, next } = useVercelParams();
  const { data: vercelProjects } = useQuery(
    ['vercelProjects', configurationId],
    () => getVercelProjects(configurationId as string),
    {
      enabled: typeof configurationId === 'string',
      placeholderData: [],
    }
  );

  const { mutateAsync: completeIntegrationMutate, isLoading } = useMutation(completeVercelIntegration, {
    onSuccess: () => {
      if (next && type === 'create') {
        window.location.replace(next);
      }
    },
    onError: (err: any) => {
      errorMessage(err?.message);
    },
  });

  const { mutateAsync: updateIntegrationMutate, isLoading: loading } = useMutation(updateVercelIntegration, {
    onSuccess: () => {
      successMessage('Updated Successfully');
    },
    onError: (err: any) => {
      errorMessage(err?.message);
    },
  });

  const [projectRowCount, setProjectRowCount] = useState(1);

  const { control, handleSubmit, reset } = useForm<ProjectLinkFormValues>({
    defaultValues: {
      projectLinkState: [
        {
          projectIds: [],
          organizationId: organizations && organizations.length > 0 ? organizations[0]._id : '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'projectLinkState',
  });

  useQuery(['configurationDetails', configurationId], () => getVercelConfigurationDetails(configurationId as string), {
    enabled: typeof configurationId === 'string' && type === 'edit',
    placeholderData: [],
    onSuccess: (data) => {
      reset({ projectLinkState: data });
      setProjectRowCount(data.length);
    },
    onError: (err: any) => {
      errorMessage(err?.message);
    },
  });

  const disableMoreProjectsBtn = Boolean(
    !organizations || organizations?.length < 1 || projectRowCount >= organizations.length
  );

  const addMoreProjectRow = () => {
    setProjectRowCount((prev) => prev + 1);
    append({
      organizationId: '',
      projectIds: [],
    });
  };

  const deleteProjectRow = (projectRowIndex: number) => {
    remove(projectRowIndex);
    setProjectRowCount((prev) => prev - 1);
  };

  const submitProjectLink = (data: ProjectLinkFormValues) => {
    const payload = data.projectLinkState.reduce((acc, curr) => {
      const { organizationId, projectIds } = curr;
      acc[organizationId] = projectIds;

      return acc;
    }, {} as Record<string, string[]>);

    if (configurationId) {
      if (type === 'create') {
        completeIntegrationMutate({
          data: payload,
          configurationId,
        });
      } else {
        updateIntegrationMutate({
          data: payload,
          configurationId,
        });
      }
    }
  };

  if (isLoading || loading) {
    return <VercelSetupLoader title={`${type === 'create' ? 'Setting up' : 'Updating'} Vercel integration...`} />;
  }

  return (
    <Stack>
      <Group position="apart" grow>
        <Box>
          <Text color={colors.B60}>Vercel Project</Text>
        </Box>
        <Box />
        <Box>
          <Text color={colors.B60}>Novu Organization</Text>
        </Box>
      </Group>

      <form noValidate onSubmit={handleSubmit(submitProjectLink)}>
        <Stack spacing="lg">
          <Stack spacing="xs">
            {fields.map((field, index) => (
              <ProjectRow
                key={field.id}
                projectData={vercelProjects}
                organizationsData={organizations || []}
                deleteProjectRow={deleteProjectRow}
                showDeleteBtn={index !== 0}
                control={control}
                index={index}
              />
            ))}
          </Stack>
          <LinkMoreProjectRow addMoreProjectRow={addMoreProjectRow} disableMoreProjectsBtn={disableMoreProjectsBtn} />
          <Button submit>Link Projects</Button>
        </Stack>
      </form>
    </Stack>
  );
}
