import { forwardRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { LocaleSelect } from '@/components/primitives/locale-select';
import { Separator } from '@/components/primitives/separator';
import { Skeleton } from '@/components/primitives/skeleton';
import { Button } from '@/components/primitives/button';
import { RiSettings4Line } from 'react-icons/ri';
import TruncatedText from '@/components/truncated-text';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { useUpdateOrganizationSettings } from '@/hooks/use-update-organization-settings';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
import { DEFAULT_LOCALE, PermissionsEnum } from '@novu/shared';
import { useHasPermission } from '@/hooks/use-has-permission';
import { PermissionButton } from '../primitives/permission-button';

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
    const { data: organizationSettings, isLoading } = useFetchOrganizationSettings();
    const updateSettings = useUpdateOrganizationSettings();
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const has = useHasPermission();
    const canWrite = has({ permission: PermissionsEnum.WORKFLOW_WRITE });

    const form = useForm<TranslationSettingsFormData>({
      defaultValues: {
        defaultLocale: DEFAULT_LOCALE,
        targetLocales: [],
      },
    });

    // Update form when organization settings are loaded
    useEffect(() => {
      if (organizationSettings?.data) {
        form.reset({
          defaultLocale: organizationSettings.data.defaultLocale,
          targetLocales: organizationSettings.data.targetLocales || [],
        });
      }
    }, [organizationSettings, form]);

    // Check if form has unsaved changes
    const formValues = form.watch();
    const hasUnsavedChanges = useMemo(() => {
      if (!organizationSettings?.data) return false;

      return (
        formValues.defaultLocale !== organizationSettings.data.defaultLocale ||
        JSON.stringify(formValues.targetLocales) !== JSON.stringify(organizationSettings.data.targetLocales)
      );
    }, [formValues, organizationSettings?.data]);

    const handleSave = () => {
      const values = form.getValues();
      updateSettings.mutate(
        {
          defaultLocale: values.defaultLocale,
          targetLocales: values.targetLocales,
        },
        {
          onSuccess: () => {
            showSuccessToast('Translation settings updated successfully');
          },
        }
      );
    };

    const handleCloseAttempt = useCallback(
      (event?: Event | KeyboardEvent) => {
        event?.preventDefault();

        if (hasUnsavedChanges) {
          setShowUnsavedDialog(true);
        } else {
          onOpenChange(false);
        }
      },
      [hasUnsavedChanges, onOpenChange]
    );

    const handleConfirmClose = useCallback(() => {
      setShowUnsavedDialog(false);
      onOpenChange(false);
    }, [onOpenChange]);

    return (
      <>
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
          <SheetContent
            ref={forwardedRef}
            className="w-[400px]"
            aria-describedby="translation-settings-description"
            onInteractOutside={handleCloseAttempt}
            onEscapeKeyDown={handleCloseAttempt}
          >
            <SheetTitle className="sr-only">Translation settings</SheetTitle>
            <SheetDescription id="translation-settings-description" className="sr-only">
              Configure translation settings for your organization
            </SheetDescription>

            <div className="flex h-full flex-col">
              <header className="border-bg-soft flex h-12 w-full flex-row items-center gap-3 border-b px-3 py-4">
                <div className="flex flex-1 items-center gap-1 overflow-hidden text-sm font-medium">
                  <RiSettings4Line className="size-5 p-0.5" />
                  <TruncatedText className="flex-1">Translation settings</TruncatedText>
                </div>
              </header>

              <div className="flex flex-1 flex-col overflow-y-auto">
                <div className="px-3 py-4">
                  {isLoading ? (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-full" />
                      </div>
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
                                  disabled={!canWrite}
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
                                  disabled={!canWrite}
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
                <Separator />
              </div>

              <div className="mt-auto">
                <Separator />
                <div className="flex justify-end gap-3 p-3.5">
                  <PermissionButton
                    permission={PermissionsEnum.WORKFLOW_WRITE}
                    variant="secondary"
                    onClick={handleSave}
                    disabled={!canWrite || !hasUnsavedChanges || updateSettings.isPending}
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
