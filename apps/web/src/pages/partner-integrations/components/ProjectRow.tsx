import { forwardRef, useRef, useEffect } from 'react';
import { Box, Group, CloseButton } from '@mantine/core';
import { useWatch, Control, Controller } from 'react-hook-form';
import { useIntersection } from '@mantine/hooks';
import type { FetchNextPageOptions, InfiniteQueryObserverResult } from '@tanstack/react-query';
import { IOrganizationEntity } from '@novu/shared';

import { Text, Select, IconOutlineArrowLeft, IconOutlineArrowRight } from '@novu/design-system';
import { OrganizationMembershipResource } from '@clerk/types';
import { ProjectLinkFormValues } from './LinkProjectContainer';

type ProjectDataType = {
  id: string;
  name: string;
  disabled?: boolean;
  infiniteHelperRef?: (element: any) => void;
};

type SelectItemProps = {
  label: string;
  value: string;
  infiniteHelperRef?: (element: any) => void;
};

type ProjectRowProps = {
  projectData: ProjectDataType[];
  organizationsData: OrganizationMembershipResource[];
  deleteProjectRow: (projectRowIndex: number) => void;
  showDeleteBtn: boolean;
  control: Control<ProjectLinkFormValues>;
  index: number;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: (options?: FetchNextPageOptions | undefined) => Promise<InfiniteQueryObserverResult<any, unknown>>;
};
export function ProjectRow(props: ProjectRowProps) {
  const {
    projectData,
    organizationsData,
    deleteProjectRow,
    showDeleteBtn,
    control,
    index,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = props;

  const formValues = useWatch({
    name: 'projectLinkState',
    control,
  });

  const eligibleProjectOptions = projectData.filter((project) =>
    formValues.every(
      (state) => formValues[index].projectIds?.includes(project.id) || !state.projectIds?.includes(project.id)
    )
  );

  const eligibleOrganizationOptions = organizationsData.filter((organization) =>
    formValues.every(
      (state) => formValues[index].organizationId === organization.id || state.organizationId !== organization.id
    )
  );

  const containerRef = useRef(null);

  const { ref: infiniteHelperRef, entry } = useIntersection({
    root: containerRef.current,
    threshold: 1,
  });

  eligibleProjectOptions.push({
    id: 'infinite-scroll-helper',
    // eslint-disable-next-line no-nested-ternary
    name: isFetchingNextPage ? 'Fetching projects...' : hasNextPage ? 'Load newer' : 'All projects fetched',
    disabled: true,
    infiniteHelperRef,
  });

  useEffect(() => {
    if (entry?.isIntersecting && !isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, entry, isFetchingNextPage, hasNextPage]);

  return (
    <Group position="center" grow>
      <Box ref={infiniteHelperRef}>
        <Controller
          name={`projectLinkState.${index}.projectIds`}
          control={control}
          rules={{
            required: 'Select a project to link',
          }}
          render={({ field, fieldState }) => {
            return (
              <Select
                error={fieldState.error?.message}
                data={(eligibleProjectOptions || []).map((data) => ({
                  value: data.id,
                  label: data.name,
                  ...(data?.disabled && { disabled: true, infiniteHelperRef: data.infiniteHelperRef }),
                }))}
                type="multiselect"
                {...field}
                itemComponent={SelectItem}
              />
            );
          }}
        />
      </Box>
      <Group grow position="apart">
        <IconOutlineArrowLeft />
        <Text align="center">links to</Text>
        <IconOutlineArrowRight />
      </Group>
      <Box>
        <Group position="left" noWrap>
          <Controller
            name={`projectLinkState.${index}.organizationId`}
            control={control}
            rules={{
              required: 'Select an Organization to link',
            }}
            render={({ field, fieldState }) => {
              return (
                <Select
                  error={fieldState.error?.message}
                  data={(eligibleOrganizationOptions || []).map((item) => ({
                    label: item.organization.name,
                    value: item.organization.id,
                  }))}
                  {...field}
                />
              );
            }}
          />
          {showDeleteBtn ? (
            <CloseButton title="remove" size="sm" iconSize={20} onClick={() => deleteProjectRow(index)} />
          ) : (
            <Box
              sx={{
                width: 25,
              }}
            />
          )}
        </Group>
      </Box>
    </Group>
  );
}

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ label, value, infiniteHelperRef, ...others }: SelectItemProps, ref) => {
    if (value === 'infinite-scroll-helper') {
      return (
        <div {...others} ref={infiniteHelperRef}>
          <Text color="dimmed">{label}</Text>
        </div>
      );
    }

    return (
      <div ref={ref} {...others}>
        <Text>{label}</Text>
      </div>
    );
  }
);
