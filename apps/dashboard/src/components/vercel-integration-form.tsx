import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { RiAddLine } from 'react-icons/ri';

import type { GetVercelConfigurationDetails } from '@/api/partner-integrations';
import { Button } from '@/components/primitives/button';
import { Form, FormRoot } from '@/components/primitives/form/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { useUpdateVercelIntegration } from '@/hooks/use-update-vercel-integration';
import { Delete } from './icons/delete';
import { MultiSelect } from './primitives/multi-select';

export type ProjectLinkFormValues = {
  projectLinkState: GetVercelConfigurationDetails[];
};

type Option = {
  value: string;
  label: string;
};

export const VercelIntegrationForm = ({
  vercelIntegrationDetails,
  organizations,
  projects,
  configurationId,
  next,
  currentOrganizationId,
}: {
  vercelIntegrationDetails?: GetVercelConfigurationDetails[];
  organizations: Option[];
  projects: Option[];
  configurationId: string | null;
  next: string | null;
  currentOrganizationId: string;
}) => {
  const [projectRowCount, setProjectRowCount] = useState(1);
  const form = useForm<ProjectLinkFormValues>({
    defaultValues: {
      projectLinkState: vercelIntegrationDetails ?? [
        {
          projectIds: [],
          organizationId: currentOrganizationId,
        },
      ],
    },
  });
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'projectLinkState',
  });

  const { mutate: updateVercelIntegration, isPending: isUpdateVercelIntegrationPending } = useUpdateVercelIntegration({
    next,
  });

  const onSubmit = (data: ProjectLinkFormValues) => {
    const payload = data.projectLinkState.reduce<Record<string, string[]>>((prev, curr) => {
      const { organizationId, projectIds } = curr;
      prev[organizationId] = projectIds;

      return prev;
    }, {});

    if (configurationId) {
      updateVercelIntegration({
        data: payload,
        configurationId,
      });
    }
  };

  const addRow = () => {
    setProjectRowCount((prev) => prev + 1);
    append({
      organizationId: '',
      projectIds: [],
    });
  };

  const removeRow = (rowIndex: number) => {
    remove(rowIndex);
    setProjectRowCount((prev) => prev - 1);
  };

  const updateRow = (rowIndex: number, value: GetVercelConfigurationDetails) => {
    update(rowIndex, value);
  };

  const isDisabledLinkMore = projectRowCount >= organizations.length || !!fields.find((el) => el.organizationId === '');

  return (
    <Form {...form}>
      <FormRoot
        autoComplete="off"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col"
        id="link-vercel-projects"
      >
        <div className="flex flex-col gap-4">
          {fields.map((row, index) => {
            const rowOrg = organizations.find((el) => row.organizationId === el.value);

            return (
              <div
                key={row.organizationId}
                className="grid grid-cols-[minmax(276px,1fr)_max-content_minmax(276px,1fr)_max-content] items-center gap-4"
              >
                <Select
                  value={row.organizationId}
                  onValueChange={(value) =>
                    updateRow(index, {
                      organizationId: value,
                      projectIds: row.projectIds,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {rowOrg && (
                      <SelectItem key={rowOrg.value} value={rowOrg.value}>
                        {rowOrg.label}
                      </SelectItem>
                    )}
                    {organizations
                      .filter((org) => !fields.some((field) => field.organizationId === org.value))
                      .map((org) => (
                        <SelectItem key={org.value} value={org.value}>
                          {org.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <span className="text-foreground-500 text-xs font-normal">links to</span>
                <MultiSelect
                  values={row.projectIds}
                  options={projects}
                  placeholder="Select projects"
                  onValuesChange={(value) =>
                    updateRow(index, {
                      organizationId: row.organizationId,
                      projectIds: value,
                    })
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  mode="ghost"
                  onClick={() => removeRow(index)}
                  className="shrink-0"
                  aria-label="Remove row"
                >
                  <Delete className="text-muted-foreground h-4 w-4" />
                </Button>
              </div>
            );
          })}
          <Button
            variant="secondary"
            mode="outline"
            onClick={addRow}
            className="flex items-center gap-2 self-start"
            disabled={isDisabledLinkMore}
          >
            <RiAddLine className="h-4 w-4" />
            {fields.length === 0 ? 'Link Organization' : 'Link Another Organization'}
          </Button>
        </div>
        <Button
          type="submit"
          className="ml-auto"
          isLoading={isUpdateVercelIntegrationPending}
          disabled={isUpdateVercelIntegrationPending}
        >
          Create Links
        </Button>
      </FormRoot>
    </Form>
  );
};
