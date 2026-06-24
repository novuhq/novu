import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { RiAddLine } from 'react-icons/ri';

import type { GetVercelConfigurationDetails } from '@/api/partner-integrations';
import { Button } from '@/components/primitives/button';
import { Form, FormRoot } from '@/components/primitives/form/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
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
  currentOrganizationId,
  onProjectLinked,
}: {
  vercelIntegrationDetails?: GetVercelConfigurationDetails[];
  organizations: Option[];
  projects: Option[];
  configurationId: string | null;
  currentOrganizationId: string;
  onProjectLinked?: (projectIds: string[]) => void;
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
    configurationId,
  });

  const onSubmit = (data: ProjectLinkFormValues) => {
    const hasEmptyProjectSelection = data.projectLinkState.some((row) => row.projectIds.length === 0);

    if (hasEmptyProjectSelection) {
      showErrorToast('Select at least one Vercel project for each organization row before linking.');

      return;
    }

    const payload = data.projectLinkState.reduce<Record<string, string[]>>((prev, curr) => {
      const { organizationId, projectIds } = curr;
      prev[organizationId] = projectIds;

      return prev;
    }, {});

    if (configurationId) {
      updateVercelIntegration(
        {
          data: payload,
          configurationId,
        },
        {
          onSuccess: () => {
            const linkedProjectIds = data.projectLinkState.flatMap((row) => row.projectIds);
            onProjectLinked?.(linkedProjectIds);
          },
        }
      );
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
          <p className="text-foreground-500 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs">
            Create Links adds these encrypted variables to your Vercel project:{' '}
            <code className="text-foreground-950">NOVU_SECRET_KEY</code>,{' '}
            <code className="text-foreground-950">NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER</code>. Redeploy production
            after linking for the agent bridge to register.
          </p>
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
