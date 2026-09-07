import type { WorkflowResponseDto } from '@novu/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { getActivityList } from '@/api/activity';
import { convertSchemaToPropertyList } from '@/components/schema-editor/utils/schema-converter';
import { useEnvironment } from '@/context/environment/hooks';
import { showErrorToast, showSuccessToast } from '../../../primitives/sonner-helpers';
import { cleanPayloadData, generateSchemaFromJson } from '../utils/generate-schema';

export function useImportSchema(workflow?: WorkflowResponseDto, formMethods?: any) {
  const [isImportMode, setIsImportMode] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [importedPayload, setImportedPayload] = useState<string>('');
  const [payloadNotFound, setPayloadNotFound] = useState(false);
  const [isManualImport, setIsManualImport] = useState(false);

  const { currentEnvironment } = useEnvironment();

  const handleImportSchema = async () => {
    if (!workflow?._id || !currentEnvironment) return;

    setIsImportMode(true);
    setIsLoadingActivity(true);
    setPayloadNotFound(false);
    setIsManualImport(false);

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

        showSuccessToast('Successfully imported payload from activity feed.');
      } else {
        showErrorToast(
          'No recent payload found. You can still manually paste your JSON above.',
          'Failed to import payload'
        );
        setPayloadNotFound(true);
        setImportedPayload('');
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
      toast.error('Failed to fetch recent payloads. Please try again.');
      setPayloadNotFound(true);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const handleImportFromJson = () => {
    setIsImportMode(true);
    setIsLoadingActivity(false);
    setPayloadNotFound(false);
    setImportedPayload('');
    setIsManualImport(true);
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
        toast.error('Invalid JSON format. Please check your payload.');
      } else {
        toast.error('Failed to generate schema. Please try again.');
      }
    }
  };

  const handleBackToManual = () => {
    setIsImportMode(false);
    setImportedPayload('');
    setPayloadNotFound(false);
    setIsManualImport(false);
  };

  return {
    isImportMode,
    isLoadingActivity,
    importedPayload,
    payloadNotFound,
    isManualImport,
    setImportedPayload,
    handleImportSchema,
    handleImportFromJson,
    handleGenerateSchema,
    handleBackToManual,
  };
}
