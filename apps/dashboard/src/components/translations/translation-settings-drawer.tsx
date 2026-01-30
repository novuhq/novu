import { DEFAULT_LOCALE, EnvironmentTypeEnum, PermissionsEnum } from '@novu/shared';
import { forwardRef, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiLoader4Line, RiSettings4Line } from 'react-icons/ri';
import { OpenAIModelEnum } from '@/api/translation-settings';
import { Button } from '@/components/primitives/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormRoot } from '@/components/primitives/form/form';
import { InlineToast } from '@/components/primitives/inline-toast';
import { LocaleSelect } from '@/components/primitives/locale-select';
import { SecretInput } from '@/components/primitives/secret-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Separator } from '@/components/primitives/separator';
import { Sheet, SheetContent, SheetTitle } from '@/components/primitives/sheet';
import { Skeleton } from '@/components/primitives/skeleton';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useCombinedRefs } from '@/hooks/use-combined-refs';
import { useFormProtection } from '@/hooks/use-form-protection';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useTestTranslationConnection } from '@/hooks/use-test-translation-connection';
import { useTranslationSettings } from '@/hooks/use-translation-settings';
import { useUpdateTranslationSettings } from '@/hooks/use-update-translation-settings';
import { PermissionButton } from '../primitives/permission-button';

/** Model display labels for the selector */
const MODEL_LABELS: Record<OpenAIModelEnum, string> = {
  [OpenAIModelEnum.GPT_4O_MINI]: 'GPT-4o Mini (Recommended)',
  [OpenAIModelEnum.GPT_4O]: 'GPT-4o',
  [OpenAIModelEnum.GPT_4_TURBO]: 'GPT-4 Turbo',
};

interface TranslationSettingsFormData {
  openaiApiKey: string;
  openaiModel: OpenAIModelEnum;
  defaultLocale: string;
  targetLocales: string[];
}

/** Connection test result state */
interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

interface TranslationSettingsDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const TranslationSettingsDrawer = forwardRef<HTMLDivElement, TranslationSettingsDrawerProps>(
  ({ isOpen, onOpenChange }, forwardedRef) => {
    const has = useHasPermission();
    const { currentEnvironment } = useEnvironment();
    const canWrite = has({ permission: PermissionsEnum.WORKFLOW_WRITE });
    const isDevEnvironment = currentEnvironment?.type === EnvironmentTypeEnum.DEV;
    const isReadOnly = !canWrite || !isDevEnvironment;

    // Fetch translation settings (includes OpenAI config)
    const { data: translationSettings, isLoading, refetch } = useTranslationSettings();
    const updateSettings = useUpdateTranslationSettings();
    const testConnection = useTestTranslationConnection();

    // Connection test result state
    const [connectionTestResult, setConnectionTestResult] = useState<ConnectionTestResult | null>(null);

    const {
      protectedOnValueChange,
      ProtectionAlert,
      ref: protectionRef,
    } = useFormProtection({
      onValueChange: onOpenChange,
    });

    const combinedRef = useCombinedRefs(forwardedRef, protectionRef);

    const form = useForm<TranslationSettingsFormData>({
      defaultValues: {
        openaiApiKey: '',
        openaiModel: OpenAIModelEnum.GPT_4O_MINI,
        defaultLocale: DEFAULT_LOCALE,
        targetLocales: [],
      },
    });

    const { reset, watch } = form;
    const currentApiKey = watch('openaiApiKey');

    // Determine if we can test connection:
    // - Either user has entered a new API key, OR
    // - Settings exist with hasApiKey === true
    const canTestConnection = Boolean(currentApiKey) || Boolean(translationSettings?.hasApiKey);

    // Update form when settings load
    useEffect(() => {
      if (translationSettings) {
        reset({
          openaiApiKey: '', // Never populate with actual key (not returned by API)
          openaiModel: translationSettings.openaiModel || OpenAIModelEnum.GPT_4O_MINI,
          defaultLocale: translationSettings.defaultLocale || DEFAULT_LOCALE,
          targetLocales: translationSettings.targetLocales || [],
        });
      }
    }, [translationSettings, reset]);

    // Clear connection test result when drawer opens/closes
    useEffect(() => {
      if (!isOpen) {
        setConnectionTestResult(null);
      }
    }, [isOpen]);

    const handleSave = useCallback(async () => {
      const formValues = form.getValues();

      if (isReadOnly) return;

      try {
        await updateSettings.mutateAsync({
          // Only include API key if user entered a new one
          ...(formValues.openaiApiKey ? { openaiApiKey: formValues.openaiApiKey } : {}),
          openaiModel: formValues.openaiModel,
          defaultLocale: formValues.defaultLocale,
          targetLocales: formValues.targetLocales,
        });

        showSuccessToast('Translation settings updated successfully');
        refetch();
        onOpenChange(false);
      } catch (error) {
        // Error handling is already handled by the mutation
      }
    }, [form, updateSettings, isReadOnly, refetch, onOpenChange]);

    const handleTestConnection = useCallback(async () => {
      setConnectionTestResult(null);

      // If user entered a new API key, save it first before testing
      const formValues = form.getValues();
      if (formValues.openaiApiKey) {
        try {
          await updateSettings.mutateAsync({
            openaiApiKey: formValues.openaiApiKey,
            openaiModel: formValues.openaiModel,
          });
          // Clear the API key field after successful save
          form.setValue('openaiApiKey', '');
          await refetch();
        } catch {
          setConnectionTestResult({
            success: false,
            message: 'Failed to save API key before testing',
          });

          return;
        }
      }

      try {
        const result = await testConnection.mutateAsync();
        setConnectionTestResult({
          success: result.success,
          message: result.message,
          latencyMs: result.latencyMs,
        });
      } catch {
        setConnectionTestResult({
          success: false,
          message: 'Connection test failed. Please check your API key.',
        });
      }
    }, [form, testConnection, updateSettings, refetch]);

    return (
      <>
        <Sheet open={isOpen} onOpenChange={protectedOnValueChange}>
          <SheetContent ref={combinedRef} side="right" className="w-[500px] max-w-none!">
            <div className="flex h-full flex-col">
              <header className="border-bg-soft flex h-12 w-full flex-row items-center gap-3 border-b px-3 py-4">
                <div className="flex flex-1 items-center gap-2 overflow-hidden text-sm font-medium">
                  <RiSettings4Line className="h-4 w-4 text-neutral-600" />
                  <SheetTitle className="flex-1 truncate pr-10 text-sm font-medium text-neutral-950">
                    Configure translation settings
                  </SheetTitle>
                </div>
              </header>

              <div className="flex-1 overflow-auto p-3.5">
                {!isDevEnvironment && (
                  <div className="mb-6">
                    <InlineToast
                      variant="warning"
                      title="View-only mode"
                      description="Edit translation settings in your development environment."
                    />
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    {isLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : (
                      <Form {...form}>
                        <FormRoot className="space-y-6">
                          {/* OpenAI Configuration Section */}
                          <div className="space-y-4">
                            <h3 className="text-text-strong text-sm font-medium">OpenAI Configuration</h3>

                            <FormField
                              control={form.control}
                              name="openaiApiKey"
                              render={({ field }) => (
                                <FormItem className="space-y-1">
                                  <FormLabel
                                    className="text-text-sub gap-1"
                                    tooltip="Your OpenAI API key for automatic translations. The key is securely stored and never exposed."
                                  >
                                    API Key
                                  </FormLabel>
                                  <FormControl>
                                    <SecretInput
                                      value={field.value}
                                      onChange={field.onChange}
                                      placeholder={
                                        translationSettings?.hasApiKey
                                          ? `sk-...${translationSettings.apiKeyLast4 || '****'}`
                                          : 'sk-...'
                                      }
                                      disabled={isReadOnly}
                                      className="w-full"
                                    />
                                  </FormControl>
                                  <span className="text-text-soft text-2xs">
                                    {translationSettings?.hasApiKey
                                      ? 'API key configured. Enter a new key to replace it.'
                                      : 'Enter your OpenAI API key to enable automatic translations.'}
                                  </span>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="openaiModel"
                              render={({ field }) => (
                                <FormItem className="space-y-1">
                                  <FormLabel
                                    className="text-text-sub gap-1"
                                    tooltip="Select the OpenAI model for translations. GPT-4o Mini is recommended for cost-effectiveness."
                                  >
                                    Model
                                  </FormLabel>
                                  <FormControl>
                                    <Select
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      disabled={isReadOnly}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a model" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(MODEL_LABELS).map(([value, label]) => (
                                          <SelectItem key={value} value={value}>
                                            {label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            {/* Test Connection Button and Result */}
                            <div className="space-y-2">
                              <Button
                                type="button"
                                variant="secondary"
                                mode="outline"
                                size="xs"
                                onClick={handleTestConnection}
                                disabled={!canTestConnection || isReadOnly || testConnection.isPending}
                              >
                                {testConnection.isPending ? (
                                  <>
                                    <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                                    Testing...
                                  </>
                                ) : (
                                  'Test Connection'
                                )}
                              </Button>

                              {connectionTestResult && (
                                <InlineToast
                                  variant={connectionTestResult.success ? 'success' : 'error'}
                                  title={connectionTestResult.success ? 'Connection successful' : 'Connection failed'}
                                  description={
                                    connectionTestResult.success
                                      ? `${connectionTestResult.message}${connectionTestResult.latencyMs ? ` (${connectionTestResult.latencyMs}ms)` : ''}`
                                      : connectionTestResult.message
                                  }
                                />
                              )}
                            </div>
                          </div>

                          <Separator />

                          {/* Locale Settings Section */}
                          <div className="space-y-4">
                            <h3 className="text-text-strong text-sm font-medium">Locale Settings</h3>

                            <FormField
                              control={form.control}
                              name="defaultLocale"
                              render={({ field }) => (
                                <FormItem className="space-y-1">
                                  <FormLabel
                                    className="text-text-sub gap-1"
                                    tooltip="The primary language for your translations - serves as fallback when language specific translations are not available"
                                  >
                                    Default language
                                  </FormLabel>
                                  <FormControl>
                                    <LocaleSelect
                                      value={field.value}
                                      onChange={field.onChange}
                                      className="w-full"
                                      disabled={isReadOnly}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="targetLocales"
                              render={({ field }) => (
                                <FormItem className="space-y-1">
                                  <FormLabel
                                    className="text-text-sub gap-1"
                                    tooltip="Languages you want to translate into. We'll check if they're in sync with your default language."
                                  >
                                    Target languages
                                  </FormLabel>
                                  <FormControl>
                                    <LocaleSelect
                                      value={field.value}
                                      onChange={field.onChange}
                                      className="w-full"
                                      multiSelect={true}
                                      disabled={isReadOnly}
                                    />
                                  </FormControl>
                                  <span className="text-text-soft text-2xs">
                                    Select all languages you want to translate into
                                  </span>
                                </FormItem>
                              )}
                            />
                          </div>
                        </FormRoot>
                      </Form>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-auto">
                <Separator />
                <div className="flex justify-end gap-3 p-3.5">
                  <PermissionButton
                    permission={PermissionsEnum.WORKFLOW_WRITE}
                    variant="secondary"
                    onClick={handleSave}
                    disabled={updateSettings.isPending || isReadOnly}
                    isLoading={updateSettings.isPending}
                  >
                    Save changes
                  </PermissionButton>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {ProtectionAlert}
      </>
    );
  }
);
