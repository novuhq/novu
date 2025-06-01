import { useState } from 'react';
import { toast } from 'sonner';
import type { WorkflowResponseDto } from '@novu/shared';
import { useEnvironment } from '@/context/environment/hooks';
import { getActivityList } from '@/api/activity';
import { convertSchemaToPropertyList } from '@/components/schema-editor/utils/schema-converter';
import { generateSchemaFromJson, cleanPayloadData } from '../utils/generate-schema';
import { ERROR_MESSAGES } from '../utils/constants';

export function useImportSchema(workflow?: WorkflowResponseDto, formMethods?: any) {
  const [isImportMode, setIsImportMode] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [importedPayload, setImportedPayload] = useState<string>('');
  const [payloadNotFound, setPayloadNotFound] = useState(false);

  const { currentEnvironment } = useEnvironment();

  const handleImportSchema = async () => {
    if (!workflow?._id || !currentEnvironment) return;

    setIsImportMode(true);
    setIsLoadingActivity(true);
    setPayloadNotFound(false);

    try {
      const response = await getActivityList({
        environment: currentEnvironment,
        page: 0,
        limit: 1,
        filters: {
          workflows: [workflow._id],
        },
      });

      if (response.data && response.data.length > 0) {
        const recentActivity = response.data[0];
        const payload = recentActivity.payload || {};

        // Clean payload and set it
        const cleanPayload = cleanPayloadData(payload);
        setImportedPayload(JSON.stringify(cleanPayload, null, 2));
      } else {
        setPayloadNotFound(true);
        setImportedPayload('');
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
      toast.error(ERROR_MESSAGES.fetchFailed);
      setPayloadNotFound(true);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const handleGenerateSchema = () => {
    if (!formMethods) return;

    try {
      const parsedPayload = JSON.parse(importedPayload);
      const generatedSchema = generateSchemaFromJson(parsedPayload);

      // Convert schema to property list format
      const propertyList = convertSchemaToPropertyList(generatedSchema.properties, generatedSchema.required);

      // Reset the form with the generated property list
      formMethods.reset({
        propertyList,
      });

      // Exit import mode
      handleBackToManual();
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error(ERROR_MESSAGES.invalidJson);
      } else {
        toast.error(ERROR_MESSAGES.generateFailed);
      }
    }
  };

  const handleBackToManual = () => {
    setIsImportMode(false);
    setImportedPayload('');
    setPayloadNotFound(false);
  };

  return {
    isImportMode,
    isLoadingActivity,
    importedPayload,
    payloadNotFound,
    setImportedPayload,
    handleImportSchema,
    handleGenerateSchema,
    handleBackToManual,
  };
}
