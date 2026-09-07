import { type IEnvironment, type WorkflowResponseDto } from '@novu/shared';
import { createContext, ReactNode, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { type UseWorkflowSchemaManagerReturn, useWorkflowSchemaManager } from './use-workflow-schema-manager';
import { useWorkflow } from './workflow-provider';

interface WorkflowSchemaContextType extends UseWorkflowSchemaManagerReturn {
  isPayloadSchemaEnabled: boolean;
}

const WorkflowSchemaContext = createContext<WorkflowSchemaContextType | undefined>(undefined);

interface WorkflowSchemaProviderProps {
  children: ReactNode;
}

export function WorkflowSchemaProvider({ children }: WorkflowSchemaProviderProps) {
  const { workflowSlug = '' } = useParams<{ workflowSlug?: string }>();
  const { workflow } = useWorkflow();
  const { currentEnvironment } = useEnvironment();
  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();

  const schemaManager = useWorkflowSchemaManager({
    workflow: workflow as WorkflowResponseDto,
    environment: currentEnvironment as IEnvironment,
    initialSchema: workflow?.payloadSchema,
    validatePayload: workflow?.validatePayload ?? false,
  });

  const contextValue: WorkflowSchemaContextType = {
    ...schemaManager,
    isPayloadSchemaEnabled,
  };

  return (
    <WorkflowSchemaContext.Provider key={workflowSlug} value={contextValue}>
      {children}
    </WorkflowSchemaContext.Provider>
  );
}

export function useWorkflowSchema(): WorkflowSchemaContextType {
  const context = useContext(WorkflowSchemaContext);

  if (context === undefined) {
    throw new Error('useWorkflowSchema must be used within a WorkflowSchemaProvider');
  }

  return context;
}
