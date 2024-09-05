import { useState, useMemo, useEffect } from 'react';
import { Stack, Group, Box } from '@mantine/core';
import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';

import { Text, colors, Button } from '@novu/design-system';
import { useOrganizationList } from '@clerk/clerk-react';
import {
  completeVercelIntegration,
  getVercelConfigurationDetails,
  getVercelProjects,
  updateVercelIntegration,
} from '../../../api/vercel-integration';
import { useVercelParams } from '../../../hooks';
import { LinkMoreProjectRow } from './LinkMoreProjectRow';
import { ProjectRow } from './ProjectRow';
import { errorMessage, successMessage } from '../../../utils/notifications';
import SetupLoader from '../../auth/components/SetupLoader';

export type ProjectLinkFormValues = {
  projectLinkState: {
    projectIds: string[];
    organizationId: string;
  }[];
};

export function LinkProjectContainer({ type }: { type: 'edit' | 'create' }) {
  const { userMemberships, isLoaded: isOrgListLoaded } = useOrganizationList({ userMemberships: { infinite: true } });
  const { configurationId, next } = useVercelParams();

  useEffect(() => {
    setTimeout(() => {
      if (userMemberships && userMemberships.revalidate) {
        userMemberships.revalidate();
      }
    }, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    data: vercelProjects,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['vercelProjects', configurationId],
    queryFn: getVercelProjects,
    enabled: typeof configurationId === 'string',
    getNextPageParam: (lastPage) => lastPage.pagination.next,
  });
  const organizations = userMemberships.data;

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
  const projects = useMemo(
    () =>
      vercelProjects?.pages.reduce((acc, curr) => {
        acc.push(...curr.projects);

        return acc;
      }, []),
    [vercelProjects]
  );

  const { control, handleSubmit, reset } = useForm<ProjectLinkFormValues>({
    defaultValues: {
      projectLinkState: [
        {
          projectIds: [],
          organizationId: organizations && organizations.length > 0 ? organizations[0].id : '',
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
    const payload = data.projectLinkState.reduce<Record<string, string[]>>((prev, curr) => {
      const { organizationId, projectIds } = curr;
      prev[organizationId] = projectIds;

      return prev;
    }, {});

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
    return <SetupLoader title={`${type === 'create' ? 'Setting up' : 'Updating'} Vercel integration...`} />;
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
                projectData={projects && projects?.length > 0 ? projects : []}
                organizationsData={organizations || []}
                deleteProjectRow={deleteProjectRow}
                showDeleteBtn={index !== 0}
                control={control}
                index={index}
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
              />
            ))}
          </Stack>
          <LinkMoreProjectRow
            addMoreProjectRow={addMoreProjectRow}
            disableMoreProjectsBtn={disableMoreProjectsBtn}
            organizationLength={
              // eslint-disable-next-line no-unsafe-optional-chaining
              organizations && organizations?.length > 0 ? organizations?.length - projectRowCount : 0
            }
          />
          <Button submit>Link Projects</Button>
        </Stack>
      </form>
    </Stack>
  );
}
