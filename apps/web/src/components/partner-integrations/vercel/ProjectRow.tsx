import { Box, Group, CloseButton, ThemeIcon } from '@mantine/core';
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useWatch, Control, Controller } from 'react-hook-form';
import { IOrganizationEntity } from '@novu/shared';
import { Text, Select } from '../../../design-system';
import { ProjectLinkFormValues } from './LinkProjectContainer';
type ProjectRowProps = {
  projectData: {
    id: string;
    name: string;
  }[];
  organizationsData: IOrganizationEntity[];
  deleteProjectRow: (projectRowIndex: number) => void;

  showDeleteBtn: boolean;
  control: Control<ProjectLinkFormValues>;
  index: number;
};
export function ProjectRow(props: ProjectRowProps) {
  const { projectData, organizationsData, deleteProjectRow, showDeleteBtn, control, index } = props;

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
      (state) => formValues[index].organizationId == organization._id || state.organizationId !== organization._id
    )
  );

  return (
    <Group position="center" grow>
      <Box>
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
                data={(eligibleProjectOptions || []).map((data) => ({ value: data.id, label: data.name }))}
                type="multiselect"
                {...field}
              />
            );
          }}
        />
      </Box>
      <Group grow position="apart">
        <ThemeIcon>
          <ArrowLeftOutlined />
        </ThemeIcon>
        <Text align="center">links to</Text>
        <ThemeIcon>
          <ArrowRightOutlined />
        </ThemeIcon>
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
                    label: item.name,
                    value: item._id,
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
