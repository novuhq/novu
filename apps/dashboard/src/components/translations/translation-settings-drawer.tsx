import { forwardRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/primitives/form/form';
import { LocaleSelect } from '@/components/primitives/locale-select';
import { Separator } from '@/components/primitives/separator';
import { Skeleton } from '@/components/primitives/skeleton';
import { RiSettings4Line } from 'react-icons/ri';
import TruncatedText from '@/components/truncated-text';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { useUpdateOrganizationSettings } from '@/hooks/use-update-organization-settings';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
import { DEFAULT_LOCALE, PermissionsEnum, EnvironmentTypeEnum } from '@novu/shared';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useEnvironment } from '@/context/environment/hooks';
import { PermissionButton } from '../primitives/permission-button';
import { InlineToast } from '@/components/primitives/inline-toast';

interface TranslationSettingsFormData {
  defaultLocale: string;
  targetLocales: string[];
}

interface TranslationSettingsDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const TranslationSettingsDrawer = forwardRef<HTMLDivElement, TranslationSettingsDrawerProps>(
  ({ isOpen, onOpenChange }, forwardedRef) => {
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const has = useHasPermission();
    const { currentEnvironment } = useEnvironment();
    const canWrite = has({ permission: PermissionsEnum.WORKFLOW_WRITE });
    const isDevEnvironment = currentEnvironment?.type === EnvironmentTypeEnum.DEV;
    const isReadOnly = !canWrite || !isDevEnvironment;

    const { data: organizationSettings, isLoading, refetch } = useFetchOrganizationSettings();
    const updateSettings = useUpdateOrganizationSettings();

    const form = useForm<TranslationSettingsFormData>({
      defaultValues: {
        defaultLocale: DEFAULT_LOCALE,
        targetLocales: [],
      },
    });

    const { watch, reset } = form;

    const formValues = watch();

    // Track unsaved changes
    const hasUnsavedChanges = useMemo(() => {
      if (!organizationSettings?.data || isLoading) return false;

      const current = {
        defaultLocale: organizationSettings.data.defaultLocale || DEFAULT_LOCALE,
        targetLocales: organizationSettings.data.targetLocales || [],
      };

      return (
        formValues.defaultLocale !== current.defaultLocale ||
        JSON.stringify(formValues.targetLocales?.sort()) !== JSON.stringify(current.targetLocales?.sort())
      );
    }, [formValues, organizationSettings?.data, isLoading]);

    // Update form when settings load
    useEffect(() => {
      if (organizationSettings?.data) {
        reset({
          defaultLocale: organizationSettings.data.defaultLocale || DEFAULT_LOCALE,
          targetLocales: organizationSettings.data.targetLocales || [],
        });
      }
    }, [organizationSettings?.data, reset]);

    const handleSave = useCallback(async () => {
      if (!hasUnsavedChanges || isReadOnly) return;

      try {
        await updateSettings.mutateAsync({
          defaultLocale: formValues.defaultLocale,
          targetLocales: formValues.targetLocales,
        });

        showSuccessToast('Translation settings updated successfully');
        refetch();
        setShowUnsavedDialog(false);
        onOpenChange(false);
      } catch (error) {
        // Error handling is already handled by the mutation
      }
    }, [hasUnsavedChanges, formValues, updateSettings, isReadOnly, refetch, onOpenChange]);

    const handleCloseAttempt = useCallback(() => {
      if (hasUnsavedChanges && !isReadOnly) {
        setShowUnsavedDialog(true);
      } else {
        onOpenChange(false);
      }
    }, [hasUnsavedChanges, onOpenChange, isReadOnly]);

    const handleConfirmClose = useCallback(() => {
      setShowUnsavedDialog(false);
      onOpenChange(false);
    }, [onOpenChange]);

    return (
      <>
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
          <SheetContent
            ref={forwardedRef}
            side="right"
            className="w-[500px] !max-w-none"
            onInteractOutside={handleCloseAttempt}
            onEscapeKeyDown={handleCloseAttempt}
          >
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
                      </div>
                    ) : (
                      <Form {...form}>
                        <div className="space-y-6">
                          <FormField
                            control={form.control}
                            name="defaultLocale"
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel
                                  className="text-text-sub gap-1"
                                  tooltip="The primary language for your translations - serves as fallback when language specific translations are not available"
                                >
                                  Default locale
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
                                  tooltip="Languages you want to translate into. We'll check if they're in sync with your default locale."
                                >
                                  Target locales
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
                    disabled={!hasUnsavedChanges || updateSettings.isPending || isReadOnly}
                    isLoading={updateSettings.isPending}
                  >
                    Save changes
                  </PermissionButton>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <UnsavedChangesAlertDialog
          show={showUnsavedDialog}
          description="You have unsaved changes to the workflow settings. These changes will be lost if you close the drawer."
          onCancel={() => setShowUnsavedDialog(false)}
          onProceed={handleConfirmClose}
        />
      </>
    );
  }
);
