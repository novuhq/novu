import { useState } from 'react';
import { RiGitPullRequestFill, RiArrowDownSLine } from 'react-icons/ri';
import { Button } from '../primitives/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../primitives/dropdown-menu';
import { EnvironmentBranchIcon } from '../primitives/environment-branch-icon';
import { Skeleton } from '../primitives/skeleton';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment, useFetchEnvironments } from '@/context/environment/hooks';
import { useDiffEnvironments } from '@/hooks/use-environments';
import { PublishEnvironmentModal } from './publish-environment-modal';

type EnvironmentDiffCardProps = {
  environment: any;
  currentEnvironmentId?: string;
  isDropdownOpen: boolean;
  onClick: () => void;
};

const EnvironmentDiffCard = ({
  environment,
  currentEnvironmentId,
  isDropdownOpen,
  onClick,
}: EnvironmentDiffCardProps) => {
  const { data: diffData, isLoading } = useDiffEnvironments({
    sourceEnvironmentId: currentEnvironmentId,
    targetEnvironmentId: environment._id,
    enabled: isDropdownOpen,
  });

  // Aggregate the summary from all resources
  const aggregatedSummary = diffData?.resources?.reduce(
    (acc, resource) => ({
      added: acc.added + resource.summary.added,
      modified: acc.modified + resource.summary.modified,
      deleted: acc.deleted + resource.summary.deleted,
      unchanged: acc.unchanged + resource.summary.unchanged,
    }),
    { added: 0, modified: 0, deleted: 0, unchanged: 0 }
  );

  const hasChanges =
    aggregatedSummary &&
    (aggregatedSummary.added > 0 || aggregatedSummary.modified > 0 || aggregatedSummary.deleted > 0);

  return (
    <DropdownMenuItem onClick={onClick} className="cursor-pointer p-1">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <EnvironmentBranchIcon environment={environment} size="sm" />
          <span className="font-medium">Publish to {environment.name}</span>
        </div>

        <div className="ml-auto">
          {isLoading ? (
            <Skeleton className="h-5 w-8 rounded-full" />
          ) : hasChanges ? (
            <div className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
              {aggregatedSummary.added > 0 && <span className="text-green-600">+{aggregatedSummary.added}</span>}
              {aggregatedSummary.modified > 0 && <span className="text-orange-600">{aggregatedSummary.modified}</span>}
              {aggregatedSummary.deleted > 0 && <span className="text-red-600">-{aggregatedSummary.deleted}</span>}
            </div>
          ) : (
            <div className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">0</div>
          )}
        </div>
      </div>
    </DropdownMenuItem>
  );
};

export const PublishButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<any>(null);
  const { currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const { environments = [] } = useFetchEnvironments({ organizationId: currentOrganization?._id });

  const otherEnvironments = environments.filter((env) => env._id !== currentEnvironment?._id);

  const handlePublishToEnvironment = (environment: any) => {
    setSelectedEnvironment(environment);
    setIsOpen(false);
    setPublishModalOpen(true);
  };

  const handleConfirmPublish = () => {
    // TODO: Implement actual publish functionality
    console.log(`Publishing to ${selectedEnvironment?.name} (${selectedEnvironment?._id})`);
    setPublishModalOpen(false);
    setSelectedEnvironment(null);
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="h-[26px]"
            mode="outline"
            size="2xs"
            leadingIcon={RiGitPullRequestFill}
            trailingIcon={RiArrowDownSLine}
            disabled={otherEnvironments.length === 0}
          >
            Publish changes
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[280px]">
          {otherEnvironments.length === 0 ? (
            <DropdownMenuItem disabled className="p-3">
              <div className="text-sm text-neutral-500">No other environments available</div>
            </DropdownMenuItem>
          ) : (
            otherEnvironments.map((environment) => (
              <EnvironmentDiffCard
                key={environment._id}
                environment={environment}
                currentEnvironmentId={currentEnvironment?._id}
                isDropdownOpen={isOpen}
                onClick={() => handlePublishToEnvironment(environment)}
              />
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <PublishEnvironmentModal
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
        environment={selectedEnvironment}
        currentEnvironment={currentEnvironment}
        onConfirm={handleConfirmPublish}
      />
    </>
  );
};
