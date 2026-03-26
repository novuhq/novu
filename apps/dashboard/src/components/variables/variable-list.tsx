import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsBoolean, PermissionsEnum } from '@novu/shared';
import { useCallback, useEffect, useState } from 'react';
import { RiAddCircleLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { PermissionButton } from '@/components/primitives/permission-button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { IS_ENTERPRISE, IS_SELF_HOSTED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchEnvironmentVariables } from '@/hooks/use-fetch-environment-variables';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { buildRoute, ROUTES } from '@/utils/routes';
import { VariableListUpgradeCta } from './variable-list-upgrade-cta';
import { VariableRow, VariableRowSkeleton } from './variable-row';

export const VariableList = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { currentEnvironment, environments } = useEnvironment();
  const navigate = useNavigate();
  const { subscription, isLoading: isLoadingSubscription } = useFetchSubscription();

  const canUseVariablesFeature =
    getFeatureForTierAsBoolean(
      FeatureNameEnum.ENVIRONMENT_VARIABLES,
      subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE
    ) &&
    (!IS_SELF_HOSTED || IS_ENTERPRISE);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const { data: variables, isLoading: isLoadingVariables } = useFetchEnvironmentVariables({
    search: debouncedSearch,
    enabled: canUseVariablesFeature,
  });

  if (isLoadingSubscription) {
    return (
      <div className="flex flex-col gap-2 py-2">
        <Table isLoading loadingRowsCount={5} loadingRow={<VariableRowSkeleton />}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[370px]">Variable</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="w-[175px]">Last updated</TableHead>
              <TableHead className="w-[52px]" />
            </TableRow>
          </TableHeader>
        </Table>
      </div>
    );
  }

  if (!canUseVariablesFeature) {
    return <VariableListUpgradeCta />;
  }

  const handleCreateClick = () => {
    if (currentEnvironment?.slug) {
      navigate(buildRoute(ROUTES.VARIABLES_CREATE, { environmentSlug: currentEnvironment.slug }));
    }
  };

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex items-center justify-between">
        <FacetedFormFilter
          type="text"
          size="small"
          title="Search"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search variables..."
        />
        <PermissionButton
          permission={PermissionsEnum.WORKFLOW_WRITE}
          variant="primary"
          mode="gradient"
          size="xs"
          leadingIcon={RiAddCircleLine}
          onClick={handleCreateClick}
        >
          Create variable
        </PermissionButton>
      </div>
      <Table isLoading={isLoadingVariables} loadingRowsCount={5} loadingRow={<VariableRowSkeleton />}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[370px]">Variable</TableHead>
            <TableHead>Value</TableHead>
            <TableHead className="w-[175px]">Last updated</TableHead>
            <TableHead className="w-[52px]" />
          </TableRow>
        </TableHeader>
        {!isLoadingVariables && (
          <TableBody>
            {variables?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-text-soft py-10 text-center text-sm">
                  {debouncedSearch ? 'No variables match your search.' : 'No variables yet. Create your first one.'}
                </TableCell>
              </TableRow>
            )}
            {variables?.map((variable) => (
              <VariableRow
                key={variable._id}
                variable={variable}
                currentEnvironment={currentEnvironment}
                environments={environments}
              />
            ))}
          </TableBody>
        )}
      </Table>
    </div>
  );
};
